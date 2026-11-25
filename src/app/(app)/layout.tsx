import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/Logo";
import { Disclaimer } from "@/components/Disclaimer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo href="/dashboard" />
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/dashboard" className="rounded-md px-3 py-2 hover:bg-sunk">Dashboard</Link>
            <Link href="/ask" className="rounded-md px-3 py-2 hover:bg-sunk">New question</Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="rounded-md px-3 py-2 text-muted hover:bg-sunk">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <Disclaimer compact />
      </footer>
    </div>
  );
}
