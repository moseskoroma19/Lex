import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="var(--accent)" />
        <path d="M9 8v16h14" stroke="var(--accent-ink)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 8h7M16 14h5" stroke="var(--brass-soft)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      LEX
    </Link>
  );
}
