import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, schema } from "@/lib/db";

function providers(): NextAuthConfig["providers"] {
  const list: NextAuthConfig["providers"] = [];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) list.push(Google);
  if (process.env.AUTH_RESEND_KEY) list.push(Resend({ from: process.env.EMAIL_FROM ?? "LEX <no-reply@example.com>" }));
  return list;
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(db(), {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: providers(),
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/signin", verifyRequest: "/signin?sent=1" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
}));

export function enabledProviders(): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) out.push({ id: "google", name: "Google" });
  if (process.env.AUTH_RESEND_KEY) out.push({ id: "resend", name: "Email" });
  return out;
}

/** Returns the signed-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
