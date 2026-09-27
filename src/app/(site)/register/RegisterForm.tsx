"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { postJSON } from "@/lib/fetcher";
import { safeNext } from "@/lib/safe-next";
import { FormError } from "@/components/AuthCard";
import { OtpStep, type Challenge } from "@/components/OtpStep";

export function RegisterForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/menu");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const res = await postJSON<Challenge>("/api/auth/register", {
      name: f.get("name"),
      email: f.get("email"),
      password: f.get("password"),
      acceptTerms: true,
    });
    setLoading(false);
    if (res.error || !res.data) return setError(res.error || "Couldn't create your account.");
    setChallenge(res.data);
  }

  if (challenge) return <OtpStep challenge={challenge} next={next} onBack={() => setChallenge(null)} />;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" autoComplete="name" className="input" required maxLength={100} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" className="input" required minLength={8} />
        <p className="mt-1 text-xs text-smoke">At least 8 characters, with a letter and a number.</p>
      </div>
      <button className="btn-primary w-full !py-3" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
      <p className="text-center text-xs text-smoke">
        By creating an account you agree to our <Link href="/legal/terms" className="text-flame-light underline" target="_blank">terms</Link> and{" "}
        <Link href="/legal/privacy" className="text-flame-light underline" target="_blank">privacy policy</Link>.
      </p>
      <p className="text-center text-sm text-smoke">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-flame-light hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
