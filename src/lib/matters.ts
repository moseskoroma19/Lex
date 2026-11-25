import { and, asc, desc, eq, gte, count } from "drizzle-orm";
import { db, schema } from "./db";
import { decrypt, decryptJson, encrypt, encryptJson } from "./crypto";
import type { VerifiedLegalAnswer } from "./legal-answer";

export type StoredAssistantContent = { kind: "answer"; answer: VerifiedLegalAnswer } | { kind: "message"; text: string };

export interface MatterSummary {
  id: string;
  title: string;
  jurisdictionId: string;
  category: string;
  language: string;
  urgency: string | null;
  status: string;
  updatedAt: Date;
}

export type MatterTurn =
  | { id: string; role: "user"; text: string; createdAt: Date }
  | { id: string; role: "assistant"; content: StoredAssistantContent; createdAt: Date };

function toSummary(m: typeof schema.matters.$inferSelect): MatterSummary {
  return {
    id: m.id,
    title: decrypt(m.titleEnc),
    jurisdictionId: m.jurisdictionId,
    category: m.category,
    language: m.language,
    urgency: m.urgency,
    status: m.status,
    updatedAt: m.updatedAt,
  };
}

export async function listMatters(userId: string, limit = 50): Promise<MatterSummary[]> {
  const rows = await db()
    .select()
    .from(schema.matters)
    .where(eq(schema.matters.userId, userId))
    .orderBy(desc(schema.matters.updatedAt))
    .limit(limit);
  return rows.map(toSummary);
}

export async function getMatter(userId: string, matterId: string): Promise<{ matter: MatterSummary; turns: MatterTurn[] } | null> {
  const [m] = await db()
    .select()
    .from(schema.matters)
    .where(and(eq(schema.matters.id, matterId), eq(schema.matters.userId, userId)))
    .limit(1);
  if (!m) return null;
  const rows = await db()
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.matterId, matterId))
    .orderBy(asc(schema.messages.createdAt));
  const turns: MatterTurn[] = rows.map((r) =>
    r.role === "user"
      ? { id: r.id, role: "user", text: decrypt(r.contentEnc), createdAt: r.createdAt }
      : { id: r.id, role: "assistant", content: decryptJson<StoredAssistantContent>(r.contentEnc), createdAt: r.createdAt },
  );
  return { matter: toSummary(m), turns };
}

export async function createMatter(opts: {
  userId: string;
  title: string;
  jurisdictionId: string;
  category: string;
  language: string;
}): Promise<string> {
  const [row] = await db()
    .insert(schema.matters)
    .values({
      userId: opts.userId,
      titleEnc: encrypt(opts.title),
      jurisdictionId: opts.jurisdictionId,
      category: opts.category,
      language: opts.language,
    })
    .returning({ id: schema.matters.id });
  return row.id;
}

export async function addUserTurn(userId: string, matterId: string, text: string): Promise<void> {
  await db().insert(schema.messages).values({ matterId, userId, role: "user", contentEnc: encrypt(text) });
}

export async function addAssistantTurn(opts: {
  userId: string;
  matterId: string;
  content: StoredAssistantContent;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  await db().insert(schema.messages).values({
    matterId: opts.matterId,
    userId: opts.userId,
    role: "assistant",
    contentEnc: encryptJson(opts.content),
    model: opts.model,
    inputTokens: opts.inputTokens,
    outputTokens: opts.outputTokens,
  });
  const update: Partial<typeof schema.matters.$inferInsert> = { updatedAt: new Date() };
  if (opts.content.kind === "answer") {
    update.urgency = opts.content.answer.risk.urgency;
    update.category = opts.content.answer.category;
  }
  await db().update(schema.matters).set(update).where(eq(schema.matters.id, opts.matterId));
}

export async function setMatterStatus(userId: string, matterId: string, status: "open" | "closed"): Promise<void> {
  await db()
    .update(schema.matters)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(schema.matters.id, matterId), eq(schema.matters.userId, userId)));
}

export async function deleteMatter(userId: string, matterId: string): Promise<void> {
  await db().delete(schema.matters).where(and(eq(schema.matters.id, matterId), eq(schema.matters.userId, userId)));
}

export async function questionsInLast24h(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db()
    .select({ n: count() })
    .from(schema.messages)
    .where(and(eq(schema.messages.userId, userId), eq(schema.messages.role, "user"), gte(schema.messages.createdAt, since)));
  return row?.n ?? 0;
}
