"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { postJSON } from "@/lib/fetcher";
import { FormError } from "@/components/AuthCard";

export function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <FormError message="This reset link is missing its token. Please use the link from your email." />
        <Link href="/forgot-password" className="btn-ghost">Request a new link</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await postJSON("/api/auth/reset", { token, password: f.get("password") });
    setLoading(false);
    if (res.error) setError(res.error);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-lg bg-emerald-950/50 p-4 text-emerald-300">Your password has been changed and you&apos;re signed in.</p>
        <Link href="/menu" className="btn-primary">Start ordering</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" className="input" required minLength={8} />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" required minLength={8} />
      </div>
      <p className="text-xs text-smoke">At least 8 characters, with a letter and a number.</p>
      <button className="btn-primary w-full !py-3" disabled={loading}>{loading ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
