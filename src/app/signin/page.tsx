import { redirect } from "next/navigation";
import { auth, enabledProviders, signIn } from "@/auth";
import { Logo } from "@/components/Logo";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ sent?: string; callbackUrl?: string }> }) {
  const { sent, callbackUrl } = await searchParams;
  const session = await auth();
  const target = callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard";
  if (session?.user) redirect(target);
  const providers = enabledProviders();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <Logo />
      <div className="card space-y-5 p-6">
        <h1 className="font-display text-2xl font-semibold">Sign in to LEX</h1>
        <p className="text-sm text-muted">Your matters and documents are private to your account and encrypted at rest.</p>

        {sent && <p className="rounded-lg bg-low-soft p-3 text-sm text-low">Check your email for a sign-in link.</p>}

        {providers.length === 0 && (
          <p className="rounded-lg bg-med-soft p-3 text-sm text-med">
            No sign-in method is configured. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET, or AUTH_RESEND_KEY, in the environment.
          </p>
        )}

        {providers.some((p) => p.id === "google") && (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: target });
            }}
          >
            <button className="btn btn-ghost w-full">Continue with Google</button>
          </form>
        )}

        {providers.some((p) => p.id === "resend") && (
          <form
            className="space-y-2"
            action={async (fd: FormData) => {
              "use server";
              await signIn("resend", { email: String(fd.get("email") ?? ""), redirectTo: target });
            }}
          >
            <label className="block text-sm">
              <span className="eyebrow mb-1 block">Email</span>
              <input name="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" />
            </label>
            <button className="btn btn-primary w-full">Email me a sign-in link</button>
          </form>
        )}
      </div>
      <Disclaimer compact />
    </div>
  );
}
