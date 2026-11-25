"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AnswerView } from "./AnswerView";
import { CATEGORIES, LANGUAGES } from "@/lib/categories";
import type { StoredAssistantContent } from "@/lib/matters";
import type { AssistantStreamEvent } from "@/app/api/assistant/route";

export type ClientTurn = { role: "user"; text: string } | { role: "assistant"; content: StoredAssistantContent };

export interface JurisdictionOption {
  id: string;
  name: string;
  coverage: "core" | "beta";
}

interface Props {
  jurisdictions: JurisdictionOption[];
  defaultJurisdictionId: string;
  defaultLanguage: string;
  defaultCategory?: string;
  matterId?: string;
  initialTurns?: ClientTurn[];
}

const STAGE_TEXT: Record<string, string> = {
  thinking: "Reading your situation",
  searching: "Searching official sources",
  reading: "Reading a source",
  writing: "Writing your answer",
};

export function AskPanel(props: Props) {
  const router = useRouter();
  const [turns, setTurns] = useState<ClientTurn[]>(props.initialTurns ?? []);
  const [question, setQuestion] = useState("");
  const [jurisdictionId, setJurisdictionId] = useState(props.defaultJurisdictionId);
  const [category, setCategory] = useState(props.defaultCategory ?? "other");
  const [language, setLanguage] = useState(props.defaultLanguage);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; detail?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const matterIdRef = useRef<string | undefined>(props.matterId);
  const isFollowUp = !!props.matterId || turns.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || question.trim().length < 10) return;
    setBusy(true);
    setError(null);
    setProgress([]);
    const asked = question.trim();
    setTurns((t) => [...t, { role: "user", text: asked }]);
    setQuestion("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matterId: matterIdRef.current, question: asked, jurisdictionId, category, language }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let gotResult = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as AssistantStreamEvent;
          if (ev.type === "matter") matterIdRef.current = ev.matterId;
          else if (ev.type === "status") setProgress((p) => [...p, { stage: ev.stage, detail: ev.detail }]);
          else if (ev.type === "result") {
            gotResult = true;
            setTurns((t) => [...t, { role: "assistant", content: ev.content }]);
          } else if (ev.type === "error") throw new Error(ev.message);
        }
      }
      if (!gotResult) throw new Error("The connection closed before the answer arrived. Please try again.");
      if (!props.matterId && matterIdRef.current) router.replace(`/matters/${matterIdRef.current}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setProgress([]);
    }
  }

  const current = progress.at(-1);
  const searches = progress.filter((p) => p.stage === "searching" || p.stage === "reading");

  return (
    <div className="space-y-6">
      {turns.map((t, i) =>
        t.role === "user" ? (
          <div key={i} className="ml-auto max-w-[85%] rounded-[10px] bg-accent-soft px-4 py-3 text-[0.95rem] whitespace-pre-wrap">
            {t.text}
          </div>
        ) : t.content.kind === "answer" ? (
          <AnswerView key={i} answer={t.content.answer} />
        ) : (
          <div key={i} className="card p-5 text-[0.95rem] whitespace-pre-wrap">
            {t.content.text}
          </div>
        ),
      )}

      {busy && (
        <div className="card p-5" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
            <span className="font-medium">{STAGE_TEXT[current?.stage ?? "thinking"]}…</span>
          </div>
          {searches.length > 0 && (
            <ul className="mt-3 space-y-1 pl-5 font-mono text-xs text-muted">
              {searches.slice(-6).map((s, i) => (
                <li key={i} className="truncate">
                  {s.stage === "searching" ? "search: " : "read: "}
                  {s.detail ?? ""}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">LEX checks official sources before answering. This usually takes one to three minutes.</p>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-[10px] border border-high/40 bg-high-soft px-4 py-3 text-sm text-high">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="card space-y-3 p-4">
        {!isFollowUp && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="eyebrow mb-1 block">Jurisdiction</span>
              <select className="field" value={jurisdictionId} onChange={(e) => setJurisdictionId(e.target.value)}>
                {props.jurisdictions.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                    {j.coverage === "beta" ? " (beta)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="eyebrow mb-1 block">Area of law</span>
              <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="eyebrow mb-1 block">Answer language</span>
              <select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <label className="block">
          <span className="sr-only">Describe your situation</span>
          <textarea
            className="field min-h-32 resize-y"
            placeholder={
              isFollowUp
                ? "Ask a follow-up or add more facts…"
                : "Describe what happened, who is involved, any dates or deadlines, and what you want to achieve. Leave out names and account numbers."
            }
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={8000}
            disabled={busy}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">Your question is encrypted and stored in your private dashboard.</p>
          <button type="submit" className="btn btn-primary" disabled={busy || question.trim().length < 10}>
            {busy ? "Working…" : isFollowUp ? "Ask follow-up" : "Get guidance"}
          </button>
        </div>
      </form>
    </div>
  );
}
