"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { postJSON } from "@/lib/fetcher";
import { safeNext } from "@/lib/safe-next";
import { FormError } from "@/components/AuthCard";

export function RegisterForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/menu");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await postJSON("/api/auth/register", {
      name: f.get("name"),
      email: f.get("email"),
      phone: f.get("phone"),
      password: f.get("password"),
      marketingOptIn: f.get("marketing") === "on",
      acceptTerms: f.get("terms") === "on",
    });
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    window.location.assign(next);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" name="name" autoComplete="name" className="input" required maxLength={100} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="phone">Mobile number</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className="input" placeholder="07123 456789" required />
        <p className="mt-1 text-xs text-smoke">So our driver can reach you.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" className="input" required minLength={8} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" required minLength={8} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-smoke">At least 8 characters, with a letter and a number.</p>
      <label className="flex items-start gap-2 text-sm text-smoke">
        <input type="checkbox" name="terms" className="mt-1 accent-orange-500" required />
        <span>
          I agree to the <Link href="/legal/terms" className="text-flame-light underline" target="_blank">terms</Link> and{" "}
          <Link href="/legal/privacy" className="text-flame-light underline" target="_blank">privacy policy</Link>.
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-smoke">
        <input type="checkbox" name="marketing" className="mt-1 accent-orange-500" />
        <span>Email me deals and offers (optional).</span>
      </label>
      <button className="btn-primary w-full !py-3" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
      <p className="text-center text-sm text-smoke">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-flame-light hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
