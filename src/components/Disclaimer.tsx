export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-muted">
        LEX gives AI-generated legal information, not legal advice. It is not a lawyer and does not create a lawyer-client
        relationship. Check important decisions with a licensed practitioner.
      </p>
    );
  }
  return (
    <div role="note" className="rounded-[10px] border border-brass/40 bg-brass-soft px-4 py-3 text-sm text-ink">
      <strong className="font-semibold">AI-generated legal information, not legal advice.</strong> LEX is not a lawyer and
      using it does not create a lawyer-client relationship. Laws change and every situation is different, so confirm
      anything important with a licensed practitioner in your jurisdiction.
    </div>
  );
}
