"use client";

import { useState } from "react";
import { postJSON } from "@/lib/fetcher";
import { FormError } from "@/components/AuthCard";

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const res = await postJSON("/api/admin/auth/login", { email: f.get("email"), password: f.get("password") });
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="admin-email">Email</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="admin-password">Password</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" className="input" required />
      </div>
      <button className="btn-primary w-full !py-3" disabled={loading}>{loading ? "Signing in…" : "Sign in to admin"}</button>
    </form>
  );
}
