import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMatters } from "@/lib/matters";
import { getJurisdiction } from "@/lib/jurisdictions";
import { CATEGORIES, categoryLabel } from "@/lib/categories";

export const metadata = { title: "Dashboard" };

const URGENCY_STYLE: Record<string, string> = {
  high: "bg-high-soft text-high",
  medium: "bg-med-soft text-med",
  low: "bg-low-soft text-low",
};

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const matters = await listMatters(session.user.id);
  const open = matters.filter((m) => m.status === "open");
  const urgent = open.filter((m) => m.urgency === "high");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            {session.user.name ? `Welcome, ${session.user.name.split(" ")[0]}` : "Your legal matters"}
          </h1>
        </div>
        <Link href="/ask" className="btn btn-primary">New question</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="eyebrow">Open matters</div>
          <div className="mt-1 font-display text-3xl font-semibold">{open.length}</div>
        </div>
        <div className="card p-4">
          <div className="eyebrow">Urgent</div>
          <div className={`mt-1 font-display text-3xl font-semibold ${urgent.length ? "text-high" : ""}`}>{urgent.length}</div>
        </div>
        <div className="card p-4">
          <div className="eyebrow">Total</div>
          <div className="mt-1 font-display text-3xl font-semibold">{matters.length}</div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Matters</h2>
        {matters.length === 0 ? (
          <div className="card p-6">
            <p className="text-muted">No matters yet. Start with an area of law:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.id !== "other").map((c) => (
                <Link key={c.id} href={`/ask?category=${c.id}`} className="rounded-full border border-line px-3 py-1 text-sm hover:bg-sunk">
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <ul className="card divide-y divide-line">
            {matters.map((m) => (
              <li key={m.id}>
                <Link href={`/matters/${m.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-sunk">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{m.title}</div>
                    <div className="text-sm text-muted">
                      {getJurisdiction(m.jurisdictionId)?.name ?? m.jurisdictionId} · {categoryLabel(m.category)} ·{" "}
                      {m.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.urgency && (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${URGENCY_STYLE[m.urgency] ?? ""}`}>
                        {m.urgency} urgency
                      </span>
                    )}
                    {m.status === "closed" && <span className="rounded-full bg-sunk px-2.5 py-0.5 text-xs text-muted">closed</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
