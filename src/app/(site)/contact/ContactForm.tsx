"use client";

import { useState } from "react";
import { postJSON } from "@/lib/fetcher";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    setError(null);
    const res = await postJSON("/api/contact", {
      name: f.get("name"),
      email: f.get("email"),
      message: f.get("message"),
    });
    if (res.error) {
      setError(res.error);
      setState("idle");
    } else setState("sent");
  }

  if (state === "sent") return <p className="rounded-lg bg-emerald-950/50 p-4 text-emerald-300">Thanks! We&apos;ll get back to you soon.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label" htmlFor="c-name">Name</label>
        <input id="c-name" name="name" className="input" required maxLength={100} />
      </div>
      <div>
        <label className="label" htmlFor="c-email">Email</label>
        <input id="c-email" name="email" type="email" className="input" required maxLength={200} />
      </div>
      <div>
        <label className="label" htmlFor="c-msg">Message</label>
        <textarea id="c-msg" name="message" className="input min-h-28" required maxLength={2000} />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn-primary w-full" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button>
      <p className="text-xs text-smoke">For questions about an order in progress, please call us.</p>
    </form>
  );
}
