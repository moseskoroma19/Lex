# LEX

AI-powered, jurisdiction-specific legal information. Users describe their situation, LEX researches the official
sources for their jurisdiction with Claude, and returns a structured answer: summary, jurisdiction, relevant law,
rights and obligations, options, risks and deadlines, next steps, verified references, and whether a lawyer is needed.

LEX provides legal information, not legal advice. This is shown throughout the app.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4). Deploys to Vercel with no extra config.
- **Claude** via `@anthropic-ai/sdk` (model `claude-opus-5-5`, streaming, server-side refusal fallback).
- **Auth.js v5** with Google and/or email magic links (Resend), database sessions.
- **Postgres** via Drizzle ORM (Neon, Supabase or any Postgres).
- **AES-256-GCM** application-level encryption for questions, answers and matter titles.

## How answers stay honest

1. **Restricted research.** For each jurisdiction, `src/lib/jurisdictions.ts` lists approved official sources
   (e.g. legislation.gov.uk, leginfo.legislature.ca.gov, ghalii.org). Claude's `web_search` and `web_fetch` tools
   can only reach those domains.
2. **Structured output.** Claude returns its answer through a strict `submit_legal_answer` tool whose schema
   (`src/lib/legal-answer.ts`) mirrors the required response structure, including currency status per reference,
   uncertainty notes and clarifying questions.
3. **Citation verification.** `src/lib/verify.ts` checks every reference URL against the pages Claude actually
   retrieved in that answer (and earlier answers in the same matter) and the approved domains. Anything else is
   shown as **unverified** with a warning, never as a source. A plausible-looking but invented link fails this check.
4. **Uncertainty and currency.** Each reference carries "in force / recently amended / change pending / check
   currency", and each answer lists its assumptions and confidence.

## Project layout

```
src/
  app/
    page.tsx                  Landing page
    signin/                   Sign-in (Google, email link)
    (app)/dashboard/          Personal dashboard of matters
    (app)/ask/                New question (jurisdiction auto-suggested from location on Vercel)
    (app)/matters/[id]/       A matter: answers plus follow-up questions
    api/assistant/route.ts    Streaming assistant endpoint (NDJSON progress + result)
  components/AnswerView.tsx   Renders the structured answer
  lib/
    assistant.ts              Claude call, research loop, verification
    prompt.ts                 System prompt and jurisdiction context
    jurisdictions.ts          Jurisdiction registry (add countries here)
    legal-answer.ts           Answer schema (Zod -> JSON schema)
    verify.ts                 Citation verification
    crypto.ts                 Encryption at rest
    matters.ts, db/           Data layer
drizzle/                      SQL migrations
tests/                        Unit tests (vitest)
```

## Run locally

```bash
cp .env.example .env.local     # fill in the values
npm install
npm run db:migrate             # creates tables
npm run dev                    # http://localhost:3000
npm test
```

Web search and web fetch must be enabled for your organization in the Claude Console.

## Deploy to Vercel on your own domain

1. Push this repository to GitHub and import it in Vercel.
2. Create a Postgres database (Vercel Marketplace: Neon or Supabase) and set `DATABASE_URL`.
3. Set `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `ENCRYPTION_KEY` and at least one sign-in provider (see `.env.example`).
   For Google sign-in, add `https://YOUR-DOMAIN/api/auth/callback/google` as an authorised redirect URI.
4. Run `npm run db:migrate` once against the production database.
5. In Vercel, Settings > Domains, add your domain and set the DNS records Vercel shows you.

The assistant route uses `maxDuration = 300` seconds, because research can take one to three minutes.

## Adding a jurisdiction

Add an entry to `JURISDICTIONS` in `src/lib/jurisdictions.ts` with its official source domains, notes and a
legal-aid pointer. Mark it `coverage: "beta"` until a qualified lawyer has reviewed the sources and sample answers.

## Roadmap

Built: auth, multi-jurisdiction assistant, structured answers, citation verification, risk assessment,
multilingual answers, dashboard, encryption at rest, daily question limit.

Next: document upload and review, document generator, lawyer directory, legal updates feed, account deletion and
data export, rate limiting at the edge, audit logging, lawyer review of each jurisdiction's sources.
