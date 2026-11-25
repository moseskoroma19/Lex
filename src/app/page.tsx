import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Disclaimer } from "@/components/Disclaimer";
import { CATEGORIES } from "@/lib/categories";
import { JURISDICTIONS } from "@/lib/jurisdictions";

const STRUCTURE = [
  "Summary of your situation",
  "Which jurisdiction's law applies",
  "Relevant laws and provisions",
  "Your rights and obligations",
  "Your options, with pros and cons",
  "Risks and deadlines",
  "Recommended next steps",
  "Verified links to official sources",
  "Whether you need a lawyer",
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/signin" className="btn btn-ghost">Sign in</Link>
          <Link href="/ask" className="btn btn-primary">Ask LEX</Link>
        </nav>
      </header>

      <section className="grid gap-10 py-12 md:grid-cols-[1.2fr_1fr] md:py-20">
        <div>
          <p className="eyebrow mb-4">Legal information for where you live</p>
          <h1 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">
            Understand your legal situation, with the law that actually applies to you.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Describe what happened in plain words. LEX researches the official legislation and case law for your
            jurisdiction and explains your rights, options, risks and next steps, with every source linked and checked.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/ask" className="btn btn-primary">Describe your situation</Link>
            <Link href="#how" className="btn btn-ghost">How LEX works</Link>
          </div>
        </div>
        <div className="card p-6">
          <p className="eyebrow mb-3">Every answer includes</p>
          <ol className="space-y-2">
            {STRUCTURE.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm">
                <span className="font-mono text-muted">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="how" className="grid gap-4 py-10 md:grid-cols-3">
        {[
          ["Jurisdiction first", "Pick your country or state, or let LEX suggest it from your location. Answers use that jurisdiction's law, and flag where another might apply."],
          ["No invented citations", "LEX can only cite pages it retrieved from approved official sources while answering. Anything it cannot match is clearly marked as unverified."],
          ["Honest about uncertainty", "Every answer lists its assumptions, what it is unsure about, and whether you should speak to a lawyer, with urgent deadlines up front."],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <h2 className="font-display text-lg font-semibold">{t}</h2>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>

      <section className="py-10">
        <h2 className="font-display text-2xl font-semibold">Areas of law</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.id !== "other").map((c) => (
            <span key={c.id} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">{c.label}</span>
          ))}
        </div>
        <h2 className="mt-10 font-display text-2xl font-semibold">Jurisdictions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {JURISDICTIONS.map((j) => (
            <span key={j.id} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
              {j.name}
              {j.coverage === "beta" && <span className="ml-1 text-xs text-muted">beta</span>}
            </span>
          ))}
        </div>
      </section>

      <footer className="space-y-4 border-t border-line py-8">
        <Disclaimer />
        <p className="text-xs text-muted">© {new Date().getFullYear()} LEX. Your questions are encrypted and never used to train AI models.</p>
      </footer>
    </div>
  );
}
