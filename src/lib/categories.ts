export const CATEGORIES = [
  { id: "criminal", label: "Criminal law" },
  { id: "family", label: "Family law" },
  { id: "employment", label: "Employment law" },
  { id: "corporate", label: "Corporate law" },
  { id: "property", label: "Property & tenancy" },
  { id: "contract", label: "Contract law" },
  { id: "tax", label: "Taxation" },
  { id: "immigration", label: "Immigration" },
  { id: "consumer", label: "Consumer protection" },
  { id: "human_rights", label: "Human rights" },
  { id: "other", label: "Other / not sure" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}

/** Languages the assistant can answer in. Citations keep their official titles. */
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
  { code: "sw", label: "Kiswahili" },
  { code: "hi", label: "हिन्दी" },
  { code: "zh", label: "中文" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? "English";
}
