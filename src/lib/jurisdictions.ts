/**
 * Jurisdiction registry.
 *
 * Each jurisdiction lists the official or authoritative sources the assistant
 * is allowed to search and cite. The assistant's web tools are restricted to
 * these domains, and every citation it returns is checked against the pages it
 * actually retrieved (see lib/verify.ts). Adding a country is a data change
 * here, not a code change.
 *
 * coverage:
 *   "core" - sources reviewed and the jurisdiction is tested end to end.
 *   "beta" - sources listed but not yet reviewed by a qualified lawyer.
 */

export type LegalSystem = "common_law" | "civil_law" | "mixed";
export type Coverage = "core" | "beta";

export interface OfficialSource {
  domain: string;
  label: string;
}

export interface Jurisdiction {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** ISO 3166-2 subdivision code, where the jurisdiction is sub-national */
  subdivision?: string;
  legalSystem: LegalSystem;
  coverage: Coverage;
  /** Sources that also apply, e.g. US federal law for a US state */
  inherits?: string[];
  sources: OfficialSource[];
  /** Context the assistant should always keep in mind */
  notes: string;
  /** Default emergency or legal-aid pointer shown in urgent cases */
  helpPointer: string;
}

const US_FEDERAL_SOURCES: OfficialSource[] = [
  { domain: "uscode.house.gov", label: "United States Code" },
  { domain: "ecfr.gov", label: "Electronic Code of Federal Regulations" },
  { domain: "govinfo.gov", label: "GovInfo" },
  { domain: "supremecourt.gov", label: "Supreme Court of the United States" },
  { domain: "law.cornell.edu", label: "Cornell LII (secondary)" },
];

export const JURISDICTIONS: Jurisdiction[] = [
  {
    id: "gb-eng",
    name: "England & Wales",
    country: "GB",
    subdivision: "GB-ENG",
    legalSystem: "common_law",
    coverage: "core",
    sources: [
      { domain: "legislation.gov.uk", label: "legislation.gov.uk" },
      { domain: "caselaw.nationalarchives.gov.uk", label: "Find Case Law (National Archives)" },
      { domain: "bailii.org", label: "BAILII" },
      { domain: "gov.uk", label: "GOV.UK" },
      { domain: "judiciary.uk", label: "Courts and Tribunals Judiciary" },
    ],
    notes:
      "Wales has devolved legislation (e.g. Renting Homes (Wales) Act 2016) that differs from England in housing and other areas. Check whether the user is in England or Wales when it matters.",
    helpPointer: "Citizens Advice (citizensadvice.org.uk) or Civil Legal Advice (gov.uk/civil-legal-advice). In an emergency call 999.",
  },
  {
    id: "gb-sct",
    name: "Scotland",
    country: "GB",
    subdivision: "GB-SCT",
    legalSystem: "mixed",
    coverage: "beta",
    sources: [
      { domain: "legislation.gov.uk", label: "legislation.gov.uk" },
      { domain: "scotcourts.gov.uk", label: "Scottish Courts and Tribunals" },
      { domain: "bailii.org", label: "BAILII" },
      { domain: "gov.scot", label: "Scottish Government" },
      { domain: "mygov.scot", label: "mygov.scot" },
    ],
    notes: "Scots law is a distinct mixed system. Do not apply English authorities unless the law is UK-wide.",
    helpPointer: "Citizens Advice Scotland (cas.org.uk) or the Scottish Legal Aid Board (slab.org.uk). In an emergency call 999.",
  },
  {
    id: "us-ca",
    name: "California, USA",
    country: "US",
    subdivision: "US-CA",
    legalSystem: "common_law",
    coverage: "core",
    inherits: ["us-federal"],
    sources: [
      { domain: "leginfo.legislature.ca.gov", label: "California Legislative Information" },
      { domain: "courts.ca.gov", label: "California Courts" },
      { domain: "oag.ca.gov", label: "California Attorney General" },
      { domain: "dir.ca.gov", label: "California Department of Industrial Relations" },
    ],
    notes: "Both California state law and US federal law may apply. Say which one each provision comes from.",
    helpPointer: "California Courts Self-Help (selfhelp.courts.ca.gov) or LawHelpCA (lawhelpca.org). In an emergency call 911.",
  },
  {
    id: "us-ny",
    name: "New York, USA",
    country: "US",
    subdivision: "US-NY",
    legalSystem: "common_law",
    coverage: "beta",
    inherits: ["us-federal"],
    sources: [
      { domain: "nysenate.gov", label: "New York State Senate (consolidated laws)" },
      { domain: "nycourts.gov", label: "New York State Unified Court System" },
      { domain: "ag.ny.gov", label: "New York Attorney General" },
    ],
    notes: "Both New York state law and US federal law may apply. New York City has additional local laws.",
    helpPointer: "LawHelpNY (lawhelpny.org) or NY Courts Help Centers (nycourts.gov/courthelp). In an emergency call 911.",
  },
  {
    id: "us-federal",
    name: "United States (federal)",
    country: "US",
    legalSystem: "common_law",
    coverage: "beta",
    sources: US_FEDERAL_SOURCES,
    notes: "Federal law only. Most everyday matters (tenancy, family, most contracts) are governed by state law, so ask which state the user is in.",
    helpPointer: "LawHelp.org lists free legal aid by state. In an emergency call 911.",
  },
  {
    id: "ca-on",
    name: "Ontario, Canada",
    country: "CA",
    subdivision: "CA-ON",
    legalSystem: "common_law",
    coverage: "beta",
    sources: [
      { domain: "ontario.ca", label: "Ontario e-Laws" },
      { domain: "laws-lois.justice.gc.ca", label: "Justice Laws (federal)" },
      { domain: "canlii.org", label: "CanLII" },
    ],
    notes: "Provincial and federal law may both apply. Criminal law is federal (Criminal Code).",
    helpPointer: "Legal Aid Ontario (legalaid.on.ca) or Steps to Justice (stepstojustice.ca). In an emergency call 911.",
  },
  {
    id: "ie",
    name: "Ireland",
    country: "IE",
    legalSystem: "common_law",
    coverage: "beta",
    sources: [
      { domain: "irishstatutebook.ie", label: "Irish Statute Book" },
      { domain: "courts.ie", label: "Courts Service of Ireland" },
      { domain: "citizensinformation.ie", label: "Citizens Information" },
      { domain: "bailii.org", label: "BAILII" },
    ],
    notes: "EU law also applies in Ireland.",
    helpPointer: "Citizens Information (citizensinformation.ie) or FLAC (flac.ie). In an emergency call 112 or 999.",
  },
  {
    id: "gh",
    name: "Ghana",
    country: "GH",
    legalSystem: "common_law",
    coverage: "core",
    sources: [
      { domain: "ghalii.org", label: "GhaLII" },
      { domain: "judicial.gov.gh", label: "Judicial Service of Ghana" },
      { domain: "parliament.gh", label: "Parliament of Ghana" },
      { domain: "gra.gov.gh", label: "Ghana Revenue Authority" },
    ],
    notes:
      "Online consolidations of Ghanaian legislation can lag behind amendments. Always mark Ghanaian provisions as needing a currency check unless the retrieved source shows the amendment date.",
    helpPointer: "Legal Aid Commission of Ghana or the Commission on Human Rights and Administrative Justice (CHRAJ). In an emergency call 112.",
  },
  {
    id: "ke",
    name: "Kenya",
    country: "KE",
    legalSystem: "common_law",
    coverage: "beta",
    sources: [
      { domain: "kenyalaw.org", label: "Kenya Law" },
      { domain: "judiciary.go.ke", label: "Judiciary of Kenya" },
      { domain: "parliament.go.ke", label: "Parliament of Kenya" },
    ],
    notes: "The Constitution of Kenya 2010 is often directly relevant to rights questions.",
    helpPointer: "National Legal Aid Service (nlas.go.ke). In an emergency call 999 or 112.",
  },
  {
    id: "za",
    name: "South Africa",
    country: "ZA",
    legalSystem: "mixed",
    coverage: "beta",
    sources: [
      { domain: "saflii.org", label: "SAFLII" },
      { domain: "gov.za", label: "South African Government" },
      { domain: "justice.gov.za", label: "Department of Justice" },
    ],
    notes: "Mixed Roman-Dutch and English common law system with a justiciable Bill of Rights.",
    helpPointer: "Legal Aid South Africa (legal-aid.co.za). In an emergency call 10111 or 112.",
  },
  {
    id: "au-nsw",
    name: "New South Wales, Australia",
    country: "AU",
    subdivision: "AU-NSW",
    legalSystem: "common_law",
    coverage: "beta",
    sources: [
      { domain: "legislation.nsw.gov.au", label: "NSW Legislation" },
      { domain: "legislation.gov.au", label: "Federal Register of Legislation" },
      { domain: "caselaw.nsw.gov.au", label: "NSW Caselaw" },
      { domain: "austlii.edu.au", label: "AustLII" },
    ],
    notes: "State and Commonwealth law may both apply.",
    helpPointer: "Legal Aid NSW (legalaid.nsw.gov.au) or LawAccess NSW (1300 888 529). In an emergency call 000.",
  },
  {
    id: "in",
    name: "India",
    country: "IN",
    legalSystem: "common_law",
    coverage: "beta",
    sources: [
      { domain: "indiacode.nic.in", label: "India Code" },
      { domain: "sci.gov.in", label: "Supreme Court of India" },
      { domain: "egazette.gov.in", label: "e-Gazette of India" },
    ],
    notes:
      "The Bharatiya Nyaya Sanhita 2023, Bharatiya Nagarik Suraksha Sanhita 2023 and Bharatiya Sakshya Adhiniyam 2023 replaced the IPC, CrPC and Evidence Act from 1 July 2024. Check which regime applies to the dates involved. State law may also apply.",
    helpPointer: "National Legal Services Authority (nalsa.gov.in), helpline 15100. In an emergency call 112.",
  },
];

const BY_ID = new Map(JURISDICTIONS.map((j) => [j.id, j]));

export function getJurisdiction(id: string): Jurisdiction | undefined {
  return BY_ID.get(id);
}

/** All sources the assistant may use for a jurisdiction, including inherited ones. */
export function sourcesFor(j: Jurisdiction): OfficialSource[] {
  const seen = new Set<string>();
  const out: OfficialSource[] = [];
  for (const s of [...j.sources, ...(j.inherits ?? []).flatMap((id) => BY_ID.get(id)?.sources ?? [])]) {
    if (!seen.has(s.domain)) {
      seen.add(s.domain);
      out.push(s);
    }
  }
  return out;
}

export function allowedDomains(j: Jurisdiction): string[] {
  return sourcesFor(j).map((s) => s.domain);
}

/**
 * Suggest a jurisdiction from the visitor's location. On Vercel the
 * x-vercel-ip-country and x-vercel-ip-country-region headers carry this.
 * Returns undefined when nothing matches, so the user picks.
 */
export function suggestJurisdiction(country?: string | null, region?: string | null): Jurisdiction | undefined {
  if (!country) return undefined;
  const c = country.toUpperCase();
  const sub = region ? `${c}-${region.toUpperCase()}` : undefined;
  if (sub) {
    const exact = JURISDICTIONS.find((j) => j.subdivision === sub);
    if (exact) return exact;
  }
  if (c === "GB") return BY_ID.get("gb-eng");
  if (c === "US") return BY_ID.get("us-federal");
  return JURISDICTIONS.find((j) => j.country === c && !j.subdivision) ?? JURISDICTIONS.find((j) => j.country === c);
}
