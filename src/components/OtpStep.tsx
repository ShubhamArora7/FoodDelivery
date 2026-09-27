"use client";

import { useState } from "react";
import { postJSON } from "@/lib/fetcher";
import { FormError } from "./AuthCard";

export type Challenge = { challengeId: string; email: string; devCode?: string };

/** Second step of sign in / sign up: enter the 6-digit code we emailed. */
export function OtpStep({ challenge, onBack, next }: { challenge: Challenge; onBack: () => void; next: string }) {
  const [current, setCurrent] = useState(challenge);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await postJSON("/api/auth/verify-code", { challengeId: current.challengeId, code });
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    window.location.assign(next);
  }

  async function resend() {
    setError(null);
    setInfo(null);
    const res = await postJSON<Challenge>("/api/auth/resend-code", { challengeId: current.challengeId });
    if (res.error || !res.data) return setError(res.error || "Couldn't send a new code.");
    setCurrent(res.data);
    setCode("");
    setInfo("We've sent a new code.");
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <p className="text-center text-sm text-smoke">
        We&apos;ve emailed a 6-digit code to <span className="font-semibold text-cream">{current.email}</span>. Enter it below to continue.
      </p>
      {current.devCode && (
        <p className="rounded-lg border border-amber-600/50 bg-amber-900/20 p-3 text-center text-sm text-amber-200">
          Test mode (email not set up yet): your code is <span className="font-mono font-bold tracking-widest">{current.devCode}</span>
        </p>
      )}
      <FormError message={error} />
      {info && <p className="text-center text-sm text-emerald-300">{info}</p>}
      <input
        id="otp"
        name="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        autoFocus
        className="input text-center font-mono text-2xl tracking-[0.5em]"
        placeholder="••••••"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        required
      />
      <button className="btn-primary w-full !py-3" disabled={loading || code.length !== 6}>{loading ? "Checking…" : "Verify and continue"}</button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={onBack} className="text-smoke hover:text-cream">← Back</button>
        <button type="button" onClick={resend} className="font-semibold text-flame-light hover:underline">Resend code</button>
      </div>
    </form>
  );
}
