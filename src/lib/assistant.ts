import Anthropic from "@anthropic-ai/sdk";
import { allowedDomains, type Jurisdiction } from "./jurisdictions";
import { LegalAnswerSchema, legalAnswerJsonSchema, type VerifiedLegalAnswer } from "./legal-answer";
import { SYSTEM_PROMPT, jurisdictionContext } from "./prompt";
import { collectRetrievedSources, dedupeSources, verifyReferences } from "./verify";

export const MODEL = "claude-opus-5-5";
const MAX_CONTINUATIONS = 6;
const SUBMIT_TOOL = "submit_legal_answer";

export type StatusEvent =
  | { type: "status"; stage: "thinking" | "searching" | "reading" | "writing"; detail?: string };

export type AssistantResult =
  | { kind: "answer"; answer: VerifiedLegalAnswer; usage: Usage }
  | { kind: "message"; text: string; usage: Usage }
  | { kind: "refused"; usage: Usage };

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  model: string;
}

export interface AssistantInput {
  jurisdiction: Jurisdiction;
  category: string;
  language: string;
  /** Earlier turns in this matter, oldest first, already rendered as text. */
  history: { role: "user" | "assistant"; text: string }[];
  question: string;
  /** Sources retrieved while answering earlier turns of this matter; they count as verified. */
  priorSources?: { url: string; title: string }[];
  onStatus?: (e: StatusEvent) => void;
  signal?: AbortSignal;
}

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

function tools(j: Jurisdiction): Anthropic.Beta.BetaToolUnion[] {
  const domains = allowedDomains(j);
  return [
    { type: "web_search_20260209", name: "web_search", max_uses: 8, allowed_domains: domains },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 8, allowed_domains: domains, max_content_tokens: 30000 },
    {
      name: SUBMIT_TOOL,
      description:
        "Submit the complete, structured legal answer for the user. Call this exactly once, after researching, as your final action.",
      input_schema: legalAnswerJsonSchema() as Anthropic.Beta.BetaTool.InputSchema,
      strict: true,
      eager_input_streaming: true,
    },
  ];
}

/**
 * Ask Claude about a legal situation.
 *
 * The model researches with web search and web fetch restricted to the
 * jurisdiction's official sources, then returns its answer through the
 * submit_legal_answer tool. Every reference is then checked against the
 * pages actually retrieved (lib/verify.ts).
 */
export async function runLegalAssistant(input: AssistantInput): Promise<AssistantResult> {
  const { jurisdiction, category, language, history, question, priorSources = [], onStatus, signal } = input;
  const today = new Date().toISOString().slice(0, 10);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.text })),
    { role: "user", content: question },
  ];

  const allBlocks: Anthropic.Beta.BetaContentBlock[] = [];
  const usage: Usage = { input_tokens: 0, output_tokens: 0, model: MODEL };

  onStatus?.({ type: "status", stage: "thinking" });

  for (let turn = 0; turn < MAX_CONTINUATIONS; turn++) {
    const stream = anthropic().beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 64000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "high" },
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          { type: "text", text: jurisdictionContext({ jurisdiction, category, language, today }) },
        ],
        tools: tools(jurisdiction),
        tool_choice: { type: "auto" },
        messages,
      },
      { signal },
    );

    // Turn tool activity into human-readable progress updates.
    const pending = new Map<number, { name: string; json: string }>();
    for await (const ev of stream) {
      if (ev.type === "content_block_start") {
        const b = ev.content_block;
        if (b.type === "server_tool_use") pending.set(ev.index, { name: b.name, json: "" });
        if (b.type === "tool_use" && b.name === SUBMIT_TOOL) onStatus?.({ type: "status", stage: "writing" });
      } else if (ev.type === "content_block_delta" && ev.delta.type === "input_json_delta") {
        const p = pending.get(ev.index);
        if (p) p.json += ev.delta.partial_json;
      } else if (ev.type === "content_block_stop") {
        const p = pending.get(ev.index);
        if (p) {
          pending.delete(ev.index);
          let parsed: { query?: string; url?: string } = {};
          try {
            parsed = JSON.parse(p.json || "{}");
          } catch {
            /* progress text only */
          }
          if (p.name === "web_search") onStatus?.({ type: "status", stage: "searching", detail: parsed.query });
          else if (p.name === "web_fetch") onStatus?.({ type: "status", stage: "reading", detail: parsed.url });
        }
      }
    }

    const msg = await stream.finalMessage();
    usage.input_tokens += msg.usage.input_tokens + (msg.usage.cache_read_input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0);
    usage.output_tokens += msg.usage.output_tokens;
    usage.model = msg.model;
    allBlocks.push(...msg.content);

    if (msg.stop_reason === "refusal") return { kind: "refused", usage };

    if (msg.stop_reason === "pause_turn") {
      // Long server-tool turn: send the content back unchanged to let it continue.
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }

    const submit = msg.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === SUBMIT_TOOL,
    );

    if (submit) {
      if (msg.stop_reason === "max_tokens") throw new Error("The answer was cut off before it was complete. Please try again.");
      const parsed = LegalAnswerSchema.safeParse(submit.input);
      if (!parsed.success) throw new Error("The assistant returned an answer in an unexpected format. Please try again.");
      const retrieved = collectRetrievedSources(allBlocks);
      const answer: VerifiedLegalAnswer = {
        ...parsed.data,
        references: verifyReferences(parsed.data, [...retrieved, ...priorSources], allowedDomains(jurisdiction)),
        sources_consulted: dedupeSources(retrieved),
        generated_at: new Date().toISOString(),
        model: msg.model,
      };
      return { kind: "answer", answer, usage };
    }

    const text = msg.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { kind: "message", text: text || "LEX could not produce an answer. Please rephrase your question.", usage };
  }

  throw new Error("The research took too long to finish. Please try a narrower question.");
}

/** Render a stored answer as text, for use as conversation history in follow-up questions. */
export function answerToHistoryText(a: VerifiedLegalAnswer): string {
  const lines = [
    `Summary: ${a.summary}`,
    a.applicable_law.length ? `Applicable law:\n${a.applicable_law.map((l) => `- ${l.provision}: ${l.explanation}`).join("\n")}` : "",
    a.options.length ? `Options:\n${a.options.map((o) => `- ${o.title}: ${o.description}`).join("\n")}` : "",
    a.next_steps.length ? `Next steps:\n${a.next_steps.map((s) => `- ${s.step}`).join("\n")}` : "",
    a.references.length
      ? `References:\n${a.references
          .map((r) => `- [${r.id}] ${r.title} ${r.url} ${r.verified ? "(verified)" : "(not verified)"}`)
          .join("\n")}`
      : "",
    a.clarifying_questions.length ? `Questions I asked the user:\n${a.clarifying_questions.map((q) => `- ${q}`).join("\n")}` : "",
  ];
  return lines.filter(Boolean).join("\n\n");
}
