import { headers } from "next/headers";
import { AskPanel } from "@/components/AskPanel";
import { Disclaimer } from "@/components/Disclaimer";
import { JURISDICTIONS, suggestJurisdiction } from "@/lib/jurisdictions";
import { CATEGORY_IDS } from "@/lib/categories";

export const metadata = { title: "Ask LEX" };

export default async function AskPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const h = await headers();
  const suggested = suggestJurisdiction(h.get("x-vercel-ip-country"), h.get("x-vercel-ip-country-region"));
  const { category } = await searchParams;
  const defaultCategory = CATEGORY_IDS.includes(category as never) ? category : "other";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">What's happening?</h1>
        <p className="mt-2 text-muted">
          Describe your situation in your own words. LEX will research the law for your jurisdiction and give you a structured answer
          with verified sources.
          {suggested && <> Based on your location we've selected <strong>{suggested.name}</strong>; change it if that's wrong.</>}
        </p>
      </div>
      <Disclaimer />
      <AskPanel
        jurisdictions={JURISDICTIONS.map((j) => ({ id: j.id, name: j.name, coverage: j.coverage }))}
        defaultJurisdictionId={suggested?.id ?? "gb-eng"}
        defaultLanguage="en"
        defaultCategory={defaultCategory}
      />
    </div>
  );
}
