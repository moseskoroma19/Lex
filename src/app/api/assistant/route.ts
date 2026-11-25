import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { currentUserId } from "@/auth";
import { answerToHistoryText, runLegalAssistant, type StatusEvent } from "@/lib/assistant";
import { CATEGORY_IDS, LANGUAGE_CODES } from "@/lib/categories";
import { getJurisdiction } from "@/lib/jurisdictions";
import { addAssistantTurn, addUserTurn, createMatter, getMatter, questionsInLast24h, type StoredAssistantContent } from "@/lib/matters";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  matterId: z.string().uuid().optional(),
  question: z.string().trim().min(10, "Please describe your situation in a little more detail.").max(8000),
  jurisdictionId: z.string(),
  category: z.enum(CATEGORY_IDS),
  language: z.enum(LANGUAGE_CODES),
});

export type AssistantStreamEvent =
  | StatusEvent
  | { type: "matter"; matterId: string }
  | { type: "result"; content: StoredAssistantContent }
  | { type: "error"; message: string };

function json(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return json(401, "Please sign in.");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  const body = parsed.data;

  const limit = Number(process.env.DAILY_QUESTION_LIMIT ?? 20);
  if ((await questionsInLast24h(userId)) >= limit) {
    return json(429, `You have reached the limit of ${limit} questions in 24 hours. Please try again later.`);
  }

  // Follow-up questions keep the matter's jurisdiction and history.
  let matterId = body.matterId;
  let history: { role: "user" | "assistant"; text: string }[] = [];
  let priorSources: { url: string; title: string }[] = [];
  let jurisdictionId = body.jurisdictionId;
  let language: string = body.language;
  if (matterId) {
    const existing = await getMatter(userId, matterId);
    if (!existing) return json(404, "Matter not found.");
    jurisdictionId = existing.matter.jurisdictionId;
    language = body.language ?? existing.matter.language;
    for (const t of existing.turns) {
      if (t.role === "user") history.push({ role: "user", text: t.text });
      else if (t.content.kind === "answer") {
        history.push({ role: "assistant", text: answerToHistoryText(t.content.answer) });
        priorSources = priorSources.concat(t.content.answer.sources_consulted);
      } else history.push({ role: "assistant", text: t.content.text });
    }
  }

  const jurisdiction = getJurisdiction(jurisdictionId);
  if (!jurisdiction) return json(400, "Unknown jurisdiction.");

  if (!matterId) {
    const title = body.question.length > 80 ? `${body.question.slice(0, 77).trimEnd()}…` : body.question;
    matterId = await createMatter({ userId, title, jurisdictionId, category: body.category, language });
  }
  await addUserTurn(userId, matterId, body.question);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AssistantStreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      send({ type: "matter", matterId: matterId! });
      try {
        const result = await runLegalAssistant({
          jurisdiction,
          category: body.category,
          language,
          history,
          priorSources,
          question: body.question,
          onStatus: send,
          signal: req.signal,
        });
        const content: StoredAssistantContent =
          result.kind === "answer"
            ? { kind: "answer", answer: result.answer }
            : result.kind === "message"
              ? { kind: "message", text: result.text }
              : {
                  kind: "message",
                  text: "LEX can't help with this request. If you are facing a legal problem, please contact a licensed lawyer or a legal aid service in your area.",
                };
        await addAssistantTurn({
          userId,
          matterId: matterId!,
          content,
          model: result.usage.model,
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
        });
        send({ type: "result", content });
      } catch (err) {
        console.error("assistant error", err);
        let message = err instanceof Error ? err.message : "Something went wrong.";
        if (err instanceof Anthropic.RateLimitError) message = "LEX is busy right now. Please try again in a minute.";
        else if (err instanceof Anthropic.APIError) message = "The AI service returned an error. Please try again.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
