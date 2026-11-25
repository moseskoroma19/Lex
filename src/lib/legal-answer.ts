import { z } from "zod";
import { CATEGORY_IDS } from "./categories";

/**
 * The structure every legal answer follows. The model returns it by calling
 * the submit_legal_answer tool, whose input schema is generated from this.
 */

const Level = z.enum(["low", "medium", "high"]);

export const ReferenceSchema = z.strictObject({
  id: z.string().describe("Short id such as R1, used by applicable_law.reference_ids"),
  title: z.string().describe("Official title, e.g. 'Housing Act 1988, section 21'"),
  citation: z.string().describe("Formal citation, or an empty string if none"),
  url: z
    .string()
    .describe("Exact URL of a page you retrieved with web_search or web_fetch in this conversation. Never construct or guess a URL."),
  source_type: z.enum(["legislation", "case_law", "constitution", "regulation", "official_guidance"]),
  currency: z.strictObject({
    status: z
      .enum(["current", "amended_recently", "pending_change", "unknown"])
      .describe("What the retrieved source shows about whether this provision is in force and up to date"),
    note: z.string().describe("e.g. 'Revised version up to date as of 1 March 2026 per legislation.gov.uk', or why it is unknown"),
  }),
});

export const LegalAnswerSchema = z.strictObject({
  summary: z.string().describe("Two to four sentences restating the user's situation in plain language"),
  category: z.enum(CATEGORY_IDS),
  jurisdiction: z.strictObject({
    name: z.string(),
    notes: z.string().describe("Which level of law applies (e.g. state and federal), or why another jurisdiction might apply. Empty string if nothing to add."),
  }),
  risk: z.strictObject({
    urgency: Level.describe("How soon the user must act"),
    complexity: Level,
    consequences: z.string().describe("What could happen if the user does nothing or gets it wrong"),
    deadlines: z.array(
      z.strictObject({
        description: z.string(),
        timeframe: z.string().describe("e.g. 'within 3 months of dismissal'"),
        reference_ids: z.array(z.string()),
      }),
    ),
  }),
  applicable_law: z.array(
    z.strictObject({
      provision: z.string(),
      explanation: z.string(),
      reference_ids: z.array(z.string()).describe("Ids from references that support this. Empty only if no retrieved source supports it, in which case say so in the explanation."),
    }),
  ),
  rights: z.array(z.string()),
  obligations: z.array(z.string()),
  options: z.array(
    z.strictObject({
      title: z.string(),
      description: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    }),
  ),
  risks: z.array(z.string()),
  next_steps: z.array(
    z.strictObject({
      step: z.string(),
      timeframe: z.string().describe("Empty string if there is no particular timing"),
    }),
  ),
  references: z.array(ReferenceSchema),
  professional_help: z.strictObject({
    level: z.enum(["essential", "recommended", "optional"]),
    reason: z.string(),
    lawyer_type: z.string().describe("e.g. 'employment solicitor', 'immigration attorney'"),
  }),
  uncertainty: z.strictObject({
    level: Level,
    notes: z.array(z.string()).describe("Every assumption you made, gap in the sources, or point a lawyer should confirm"),
  }),
  clarifying_questions: z.array(z.string()).describe("Facts that would change the answer. Empty if none."),
});

export type LegalAnswer = z.infer<typeof LegalAnswerSchema>;
export type Reference = z.infer<typeof ReferenceSchema>;

/** A reference after server-side verification against retrieved sources. */
export type VerifiedReference = Reference & {
  verified: boolean;
  /** Why it could not be verified, when verified is false */
  verification_note?: string;
};

export type VerifiedLegalAnswer = Omit<LegalAnswer, "references"> & {
  references: VerifiedReference[];
  /** Sources the assistant actually retrieved while answering */
  sources_consulted: { url: string; title: string }[];
  generated_at: string;
  model: string;
};

export function legalAnswerJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(LegalAnswerSchema, { target: "draft-2020-12" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
