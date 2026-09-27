"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { postJSON } from "@/lib/fetcher";
import { safeNext } from "@/lib/safe-next";
import { FormError } from "@/components/AuthCard";
import { OtpStep, type Challenge } from "@/components/OtpStep";

export function LoginForm() {
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
    const res = await postJSON<Challenge>("/api/auth/login", { email: f.get("email"), password: f.get("password") });
    setLoading(false);
    if (res.error || !res.data) return setError(res.error || "Couldn't sign in.");
    setChallenge(res.data);
  }

  if (challenge) return <OtpStep challenge={challenge} next={next} onBack={() => setChallenge(null)} />;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" className="input" required />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">Password</label>
          <Link href="/forgot-password" className="mb-1.5 text-xs text-flame-light hover:underline">Forgot password?</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
      </div>
      <button className="btn-primary w-full !py-3" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-sm text-smoke">
        New here?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-flame-light hover:underline">Create an account</Link>
      </p>
    </form>
  );
}
