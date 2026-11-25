import { describe, expect, it, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt, decryptJson, encryptJson } from "@/lib/crypto";
import { JURISDICTIONS, allowedDomains, getJurisdiction, suggestJurisdiction } from "@/lib/jurisdictions";
import { LegalAnswerSchema, legalAnswerJsonSchema } from "@/lib/legal-answer";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("crypto", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encrypt("My landlord gave me notice");
    const b = encrypt("My landlord gave me notice");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("My landlord gave me notice");
    expect(decryptJson(encryptJson({ x: [1, "é"] }))).toEqual({ x: [1, "é"] });
  });
  it("rejects tampered ciphertext", () => {
    const parts = encrypt("secret").split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });
});

describe("jurisdictions", () => {
  it("have unique ids and at least one source each", () => {
    expect(new Set(JURISDICTIONS.map((j) => j.id)).size).toBe(JURISDICTIONS.length);
    for (const j of JURISDICTIONS) expect(allowedDomains(j).length).toBeGreaterThan(0);
  });
  it("US states inherit federal sources", () => {
    expect(allowedDomains(getJurisdiction("us-ca")!)).toContain("uscode.house.gov");
  });
  it("suggests from location headers", () => {
    expect(suggestJurisdiction("US", "CA")?.id).toBe("us-ca");
    expect(suggestJurisdiction("GB", "ENG")?.id).toBe("gb-eng");
    expect(suggestJurisdiction("GH", null)?.id).toBe("gh");
    expect(suggestJurisdiction("FR", null)).toBeUndefined();
    expect(suggestJurisdiction(null, null)).toBeUndefined();
  });
});

describe("answer schema", () => {
  it("produces a strict-tool-compatible JSON schema", () => {
    const s = legalAnswerJsonSchema() as { type: string; additionalProperties: boolean; required: string[]; $schema?: string };
    expect(s.type).toBe("object");
    expect(s.additionalProperties).toBe(false);
    expect(s.$schema).toBeUndefined();
    expect(s.required).toContain("references");
    expect(JSON.stringify(s)).not.toMatch(/"additionalProperties":true/);
  });
  it("rejects extra fields", () => {
    expect(LegalAnswerSchema.safeParse({ summary: "x", extra: 1 }).success).toBe(false);
  });
});
