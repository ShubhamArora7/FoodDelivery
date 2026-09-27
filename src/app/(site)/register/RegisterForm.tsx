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
    const addr = {
      postcode: String(f.get("a-postcode") || "").trim(),
      line1: String(f.get("a-line1") || "").trim(),
      line2: String(f.get("a-line2") || "").trim() || null,
      city: String(f.get("a-city") || "").trim(),
    };
    const hasAddress = !!(addr.postcode || addr.line1);
    if (hasAddress && (!addr.postcode || !addr.line1 || !addr.city)) {
      setError("Please finish your delivery address (postcode, address line 1 and town), or leave it blank to add it later.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await postJSON("/api/auth/register", {
      address: hasAddress ? { label: "Home", ...addr } : null,
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
      <fieldset className="space-y-3 rounded-xl border border-line bg-coal/60 p-4">
        <legend className="px-1 font-display text-sm uppercase tracking-wider text-flame-light">Delivery address</legend>
        <p className="-mt-1 text-xs text-smoke">Save it now so checkout is quick. You can add more addresses later in your account.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="a-postcode">Postcode</label>
            <input id="a-postcode" name="a-postcode" className="input uppercase" placeholder="WR1 1SB" autoComplete="postal-code" />
          </div>
          <div>
            <label className="label" htmlFor="a-city">Town / city</label>
            <input id="a-city" name="a-city" className="input" defaultValue="Worcester" autoComplete="address-level2" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="a-line1">Address line 1</label>
          <input id="a-line1" name="a-line1" className="input" placeholder="House number and street" autoComplete="address-line1" />
        </div>
        <div>
          <label className="label" htmlFor="a-line2">Address line 2 <span className="normal-case">(optional)</span></label>
          <input id="a-line2" name="a-line2" className="input" placeholder="Flat, building" autoComplete="address-line2" />
        </div>
      </fieldset>
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
