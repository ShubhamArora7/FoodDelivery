"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard, FormError } from "@/components/AuthCard";
import { postJSON } from "@/lib/fetcher";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const res = await postJSON("/api/auth/forgot", { email: f.get("email") });
    setLoading(false);
    if (res.error) setError(res.error);
    else setSent(true);
  }

  return (
    <AuthCard title="Reset password" subtitle="We'll email you a link to choose a new password">
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="rounded-lg bg-emerald-950/50 p-4 text-emerald-300">
            If an account exists for that email, a reset link is on its way. It expires in 1 hour.
          </p>
          <Link href="/login" className="btn-ghost">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={error} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" className="input" required />
          </div>
          <button className="btn-primary w-full !py-3" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button>
          <p className="text-center text-sm">
            <Link href="/login" className="text-flame-light hover:underline">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
