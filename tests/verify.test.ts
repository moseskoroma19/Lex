import { describe, expect, it } from "vitest";
import { hostMatches, normalizeUrl, verifyReferences, collectRetrievedSources } from "@/lib/verify";
import type { LegalAnswer } from "@/lib/legal-answer";

const base: LegalAnswer = {
  summary: "s",
  category: "property",
  jurisdiction: { name: "England & Wales", notes: "" },
  risk: { urgency: "low", complexity: "low", consequences: "", deadlines: [] },
  applicable_law: [],
  rights: [],
  obligations: [],
  options: [],
  risks: [],
  next_steps: [],
  references: [],
  professional_help: { level: "optional", reason: "", lawyer_type: "" },
  uncertainty: { level: "low", notes: [] },
  clarifying_questions: [],
};

const ref = (id: string, url: string) => ({
  id,
  title: id,
  citation: "",
  url,
  source_type: "legislation" as const,
  currency: { status: "current" as const, note: "" },
});

describe("normalizeUrl", () => {
  it("ignores www, trailing slash, fragment and http/https", () => {
    expect(normalizeUrl("http://www.legislation.gov.uk/ukpga/1988/50/section/21/#p1")).toBe(
      "https://legislation.gov.uk/ukpga/1988/50/section/21",
    );
  });
  it("rejects non-http urls", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("hostMatches", () => {
  it("accepts the domain and its subdomains only", () => {
    expect(hostMatches("https://www.legislation.gov.uk/x", ["legislation.gov.uk"])).toBe(true);
    expect(hostMatches("https://caselaw.nationalarchives.gov.uk/x", ["nationalarchives.gov.uk"])).toBe(true);
    expect(hostMatches("https://legislation.gov.uk.evil.com/x", ["legislation.gov.uk"])).toBe(false);
    expect(hostMatches("https://notlegislation.gov.uk/x", ["legislation.gov.uk"])).toBe(false);
  });
});

describe("verifyReferences", () => {
  const retrieved = [{ url: "https://www.legislation.gov.uk/ukpga/1988/50/section/21", title: "s21" }];
  const domains = ["legislation.gov.uk", "bailii.org"];

  it("verifies a reference that was retrieved", () => {
    const [r] = verifyReferences({ ...base, references: [ref("R1", "https://legislation.gov.uk/ukpga/1988/50/section/21/")] }, retrieved, domains);
    expect(r.verified).toBe(true);
  });

  it("flags a plausible but never-retrieved url (fabrication)", () => {
    const [r] = verifyReferences({ ...base, references: [ref("R1", "https://www.legislation.gov.uk/ukpga/1988/50/section/8")] }, retrieved, domains);
    expect(r.verified).toBe(false);
    expect(r.verification_note).toMatch(/could not match/);
  });

  it("flags off-list domains even if retrieved", () => {
    const [r] = verifyReferences(
      { ...base, references: [ref("R1", "https://example.com/law")] },
      [{ url: "https://example.com/law", title: "x" }],
      domains,
    );
    expect(r.verified).toBe(false);
  });

  it("flags empty urls", () => {
    const [r] = verifyReferences({ ...base, references: [ref("R1", "")] }, retrieved, domains);
    expect(r.verified).toBe(false);
  });
});

describe("collectRetrievedSources", () => {
  it("reads search and fetch results, and skips errors", () => {
    const blocks = [
      { type: "web_search_tool_result", tool_use_id: "a", content: [{ type: "web_search_result", url: "https://a.gov/1", title: "A", encrypted_content: "", page_age: null }] },
      { type: "web_search_tool_result", tool_use_id: "b", content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" } },
      { type: "web_fetch_tool_result", tool_use_id: "c", content: { type: "web_fetch_result", url: "https://a.gov/2", retrieved_at: null, content: { type: "document", title: "B", source: {} } } },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(collectRetrievedSources(blocks as any)).toEqual([
      { url: "https://a.gov/1", title: "A" },
      { url: "https://a.gov/2", title: "B" },
    ]);
  });
});
