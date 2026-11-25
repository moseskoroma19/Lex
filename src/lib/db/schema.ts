import { integer, pgTable, primaryKey, text, timestamp, index } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ---------- Auth.js tables ---------- */

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  /** Preferred jurisdiction and answer language */
  jurisdictionId: text("jurisdiction_id"),
  language: text("language").default("en"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ---------- LEX domain ---------- */

/** A legal matter: one situation the user is working through, with its conversation. */
export const matters = pgTable(
  "matter",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Encrypted */
    titleEnc: text("title_enc").notNull(),
    jurisdictionId: text("jurisdiction_id").notNull(),
    category: text("category").notNull(),
    language: text("language").notNull().default("en"),
    urgency: text("urgency"),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("matter_user_idx").on(t.userId, t.updatedAt)],
);

/** A turn in a matter. User turns hold the question; assistant turns hold a VerifiedLegalAnswer. */
export const messages = pgTable(
  "message",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    matterId: text("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    /** Encrypted. User: plain text. Assistant: JSON of VerifiedLegalAnswer, or {text} for a plain reply. */
    contentEnc: text("content_enc").notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("message_matter_idx").on(t.matterId, t.createdAt), index("message_user_idx").on(t.userId, t.createdAt)],
);
