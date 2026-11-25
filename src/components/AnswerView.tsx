import type { VerifiedLegalAnswer, VerifiedReference } from "@/lib/legal-answer";
import { categoryLabel } from "@/lib/categories";

const LEVEL_STYLE: Record<string, string> = {
  high: "bg-high-soft text-high",
  medium: "bg-med-soft text-med",
  low: "bg-low-soft text-low",
  essential: "bg-high-soft text-high",
  recommended: "bg-med-soft text-med",
  optional: "bg-low-soft text-low",
};

function Pill({ level, children }: { level: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLE[level] ?? "bg-sunk text-muted"}`}>
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h3 className="mb-3 font-display text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function RefChips({ ids, refs }: { ids: string[]; refs: VerifiedReference[] }) {
  if (!ids.length) return <span className="ml-1 text-xs text-med">(no retrieved source)</span>;
  return (
    <>
      {ids.map((id) => {
        const r = refs.find((x) => x.id === id);
        return (
          <a
            key={id}
            href={`#ref-${id}`}
            className={`ml-1 rounded px-1.5 py-0.5 font-mono text-[0.7rem] ${r?.verified ? "bg-accent-soft text-accent" : "bg-med-soft text-med"}`}
          >
            {id}
          </a>
        );
      })}
    </>
  );
}

const CURRENCY_LABEL: Record<string, string> = {
  current: "In force, up to date",
  amended_recently: "Recently amended",
  pending_change: "Change pending",
  unknown: "Check currency",
};

export function AnswerView({ answer }: { answer: VerifiedLegalAnswer }) {
  const refs = answer.references;
  const verified = refs.filter((r) => r.verified);
  const unverified = refs.filter((r) => !r.verified);

  return (
    <article className="card space-y-5 p-5 sm:p-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{answer.jurisdiction.name}</span>
          <span className="eyebrow">·</span>
          <span className="eyebrow">{categoryLabel(answer.category)}</span>
        </div>
        <p className="text-[1.02rem] leading-relaxed">{answer.summary}</p>
        {answer.jurisdiction.notes && <p className="text-sm text-muted">{answer.jurisdiction.notes}</p>}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-sunk p-3">
          <div className="eyebrow mb-1">Urgency</div>
          <Pill level={answer.risk.urgency}>{answer.risk.urgency}</Pill>
        </div>
        <div className="rounded-lg bg-sunk p-3">
          <div className="eyebrow mb-1">Complexity</div>
          <Pill level={answer.risk.complexity}>{answer.risk.complexity}</Pill>
        </div>
        <div className="rounded-lg bg-sunk p-3">
          <div className="eyebrow mb-1">Lawyer</div>
          <Pill level={answer.professional_help.level}>{answer.professional_help.level}</Pill>
        </div>
      </div>

      {answer.risk.deadlines.length > 0 && (
        <div className="rounded-lg border border-high/40 bg-high-soft p-4">
          <h3 className="mb-2 font-semibold text-high">Deadlines</h3>
          <ul className="space-y-1.5 text-sm">
            {answer.risk.deadlines.map((d, i) => (
              <li key={i}>
                <strong>{d.timeframe}:</strong> {d.description}
                <RefChips ids={d.reference_ids} refs={refs} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {answer.applicable_law.length > 0 && (
        <Section title="Relevant law">
          <ul className="space-y-3">
            {answer.applicable_law.map((l, i) => (
              <li key={i}>
                <div className="font-medium">
                  {l.provision}
                  <RefChips ids={l.reference_ids} refs={refs} />
                </div>
                <p className="text-sm leading-relaxed text-muted">{l.explanation}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(answer.rights.length > 0 || answer.obligations.length > 0) && (
        <Section title="Your rights and obligations">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="eyebrow mb-2">Rights</div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {answer.rights.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow mb-2">Obligations</div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {answer.obligations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {answer.options.length > 0 && (
        <Section title="Your options">
          <div className="grid gap-3">
            {answer.options.map((o, i) => (
              <div key={i} className="rounded-lg border border-line p-4">
                <div className="font-medium">{o.title}</div>
                <p className="mt-1 text-sm text-muted">{o.description}</p>
                {(o.pros.length > 0 || o.cons.length > 0) && (
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <ul className="space-y-0.5">
                      {o.pros.map((p, j) => (
                        <li key={j} className="text-low">+ {p}</li>
                      ))}
                    </ul>
                    <ul className="space-y-0.5">
                      {o.cons.map((p, j) => (
                        <li key={j} className="text-med">− {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(answer.risks.length > 0 || answer.risk.consequences) && (
        <Section title="Risks and consequences">
          {answer.risk.consequences && <p className="mb-2 text-sm">{answer.risk.consequences}</p>}
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {answer.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Section>
      )}

      {answer.next_steps.length > 0 && (
        <Section title="Recommended next steps">
          <ol className="space-y-2">
            {answer.next_steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink">
                  {i + 1}
                </span>
                <span>
                  {s.step}
                  {s.timeframe && <span className="text-muted"> · {s.timeframe}</span>}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title="Do you need a lawyer?">
        <p className="text-sm">
          <Pill level={answer.professional_help.level}>{answer.professional_help.level}</Pill>{" "}
          {answer.professional_help.reason}
        </p>
        {answer.professional_help.lawyer_type && (
          <p className="mt-1 text-sm text-muted">Look for: {answer.professional_help.lawyer_type}</p>
        )}
      </Section>

      <Section title="Legal references">
        {verified.length === 0 && (
          <p className="mb-3 text-sm text-med">LEX could not verify any sources for this answer. Treat it as general orientation only.</p>
        )}
        <ul className="space-y-2.5">
          {verified.map((r) => (
            <li key={r.id} id={`ref-${r.id}`} className="text-sm">
              <span className="mr-2 rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[0.7rem] text-accent">{r.id}</span>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline-offset-2 hover:underline">
                {r.title}
              </a>
              {r.citation && <span className="text-muted"> · {r.citation}</span>}
              <div className="mt-0.5 flex flex-wrap items-center gap-2 pl-9 text-xs text-muted">
                <span className="rounded bg-low-soft px-1.5 py-0.5 text-low">Verified source</span>
                <span className={r.currency.status === "current" ? "" : "text-med"}>{CURRENCY_LABEL[r.currency.status]}</span>
                {r.currency.note && <span>· {r.currency.note}</span>}
              </div>
            </li>
          ))}
        </ul>
        {unverified.length > 0 && (
          <details className="mt-4 rounded-lg border border-med/40 bg-med-soft p-3 text-sm">
            <summary className="cursor-pointer font-medium text-med">
              {unverified.length} reference{unverified.length > 1 ? "s" : ""} could not be verified
            </summary>
            <ul className="mt-2 space-y-2">
              {unverified.map((r) => (
                <li key={r.id} id={`ref-${r.id}`}>
                  <span className="font-mono text-[0.7rem]">{r.id}</span> {r.title}
                  <div className="text-xs text-muted">{r.verification_note} Do not rely on it without checking.</div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      {(answer.uncertainty.notes.length > 0 || answer.clarifying_questions.length > 0) && (
        <Section title="What LEX is unsure about">
          <p className="mb-2 text-sm">
            Confidence: <Pill level={answer.uncertainty.level === "high" ? "high" : answer.uncertainty.level === "low" ? "low" : "medium"}>
              {answer.uncertainty.level === "high" ? "low confidence" : answer.uncertainty.level === "low" ? "high confidence" : "moderate"}
            </Pill>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {answer.uncertainty.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {answer.clarifying_questions.length > 0 && (
            <>
              <div className="eyebrow mb-1 mt-4">Answering these would sharpen the answer</div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {answer.clarifying_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </Section>
      )}

      <footer className="border-t border-line pt-4 text-xs text-muted">
        AI-generated legal information by LEX, {new Date(answer.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
        Not reviewed by a lawyer. {answer.sources_consulted.length} official source page{answer.sources_consulted.length === 1 ? "" : "s"} consulted.
      </footer>
    </article>
  );
}
