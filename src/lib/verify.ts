import type Anthropic from "@anthropic-ai/sdk";
import type { LegalAnswer, VerifiedReference } from "./legal-answer";

/**
 * Citation verification.
 *
 * The model may only cite pages that its web_search or web_fetch tools
 * actually returned during this answer, and only on the jurisdiction's
 * approved domains. Anything else is marked unverified and shown to the user
 * with a warning, so a fabricated or guessed citation can never appear as a
 * verified source.
 */

export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.hash = "";
    u.protocol = "https:";
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    let path = u.pathname.replace(/\/+$/, "");
    return `https://${host}${path}${u.search}`;
  } catch {
    return null;
  }
}

export function hostMatches(url: string, domains: string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export interface RetrievedSource {
  url: string;
  title: string;
}

/** Collect every URL the server tools returned in a set of response blocks. */
export function collectRetrievedSources(blocks: Anthropic.Beta.BetaContentBlock[]): RetrievedSource[] {
  const out: RetrievedSource[] = [];
  for (const b of blocks) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      for (const r of b.content) {
        if (r.type === "web_search_result") out.push({ url: r.url, title: r.title });
      }
    } else if (b.type === "web_fetch_tool_result" && b.content.type === "web_fetch_result") {
      out.push({ url: b.content.url, title: b.content.content.title ?? b.content.url });
    }
  }
  return out;
}

export function verifyReferences(
  answer: LegalAnswer,
  retrieved: RetrievedSource[],
  allowedDomains: string[],
): VerifiedReference[] {
  const seen = new Set(retrieved.map((s) => normalizeUrl(s.url)).filter((u): u is string => !!u));
  return answer.references.map((ref) => {
    const norm = normalizeUrl(ref.url);
    if (!norm) {
      return { ...ref, verified: false, verification_note: "No valid link was provided for this reference." };
    }
    if (!hostMatches(norm, allowedDomains)) {
      return { ...ref, verified: false, verification_note: "This link is not on an approved official source for the jurisdiction." };
    }
    if (!seen.has(norm)) {
      return { ...ref, verified: false, verification_note: "LEX could not match this link to a page it actually retrieved while answering." };
    }
    return { ...ref, verified: true };
  });
}

/** De-duplicated list of retrieved sources, for the "sources consulted" panel. */
export function dedupeSources(sources: RetrievedSource[]): RetrievedSource[] {
  const map = new Map<string, RetrievedSource>();
  for (const s of sources) {
    const n = normalizeUrl(s.url);
    if (n && !map.has(n)) map.set(n, s);
  }
  return [...map.values()];
}
