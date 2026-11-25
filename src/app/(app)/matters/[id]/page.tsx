import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { AskPanel, type ClientTurn } from "@/components/AskPanel";
import { getMatter, deleteMatter, setMatterStatus } from "@/lib/matters";
import { getJurisdiction, JURISDICTIONS } from "@/lib/jurisdictions";
import { categoryLabel } from "@/lib/categories";

export const metadata = { title: "Matter" };

export default async function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect("/signin");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getMatter(userId, id);
  if (!data) notFound();
  const { matter, turns } = data;
  const j = getJurisdiction(matter.jurisdictionId);

  const initialTurns: ClientTurn[] = turns.map((t) =>
    t.role === "user" ? { role: "user", text: t.text } : { role: "assistant", content: t.content },
  );

  async function toggleStatus() {
    "use server";
    const uid = await currentUserId();
    if (!uid) return;
    await setMatterStatus(uid, id, matter.status === "open" ? "closed" : "open");
    redirect(`/matters/${id}`);
  }

  async function remove() {
    "use server";
    const uid = await currentUserId();
    if (!uid) return;
    await deleteMatter(uid, id);
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-muted hover:underline">← Dashboard</Link>
          <h1 className="mt-2 font-display text-2xl font-semibold">{matter.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {j?.name ?? matter.jurisdictionId} · {categoryLabel(matter.category)} · {matter.status === "open" ? "Open" : "Closed"}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={toggleStatus}>
            <button className="btn btn-ghost">{matter.status === "open" ? "Mark closed" : "Reopen"}</button>
          </form>
          <form action={remove}>
            <button className="btn btn-ghost text-high">Delete</button>
          </form>
        </div>
      </div>
      <AskPanel
        jurisdictions={JURISDICTIONS.map((x) => ({ id: x.id, name: x.name, coverage: x.coverage }))}
        defaultJurisdictionId={matter.jurisdictionId}
        defaultLanguage={matter.language}
        defaultCategory={matter.category}
        matterId={matter.id}
        initialTurns={initialTurns}
      />
    </div>
  );
}
