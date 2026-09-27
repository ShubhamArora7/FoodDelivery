"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchJSON, postJSON } from "@/lib/fetcher";

type Member = { id: string; name: string; email: string; role: "CUSTOMER" | "STAFF" | "ADMIN" };

export function StaffManager({ staff, meId }: { staff: Member[]; meId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function changeRole(m: Member, role: Member["role"]) {
    if (role === "CUSTOMER" && !window.confirm(`Remove admin access for ${m.name}?`)) return;
    const res = await patchJSON(`/api/admin/staff/${m.id}`, { role });
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await postJSON("/api/admin/staff", {
      name: f.get("name"),
      email: f.get("email"),
      password: f.get("password"),
      role: f.get("role"),
    });
    if (res.error) return setError(res.error);
    setAdding(false);
    setError(null);
    router.refresh();
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl uppercase">Staff</h1>
        {!adding && <button className="btn-primary ml-auto" onClick={() => setAdding(true)}>+ Add staff</button>}
      </div>
      <div className="card p-4 text-sm text-smoke">
        <p><strong className="text-cream">Staff</strong> can see and update orders, mark items sold out and pause ordering.</p>
        <p><strong className="text-cream">Admins</strong> can also edit the menu, prices, discount codes, settings, refunds and staff.</p>
      </div>
      {error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
      {adding && (
        <form onSubmit={add} className="card grid gap-3 p-5 sm:grid-cols-2">
          <div><label className="label">Name</label><input name="name" className="input" required /></div>
          <div><label className="label">Email</label><input name="email" type="email" className="input" required /></div>
          <div><label className="label">Temporary password</label><input name="password" type="text" className="input" required minLength={8} placeholder="8+ chars, letter & number" /></div>
          <div>
            <label className="label">Role</label>
            <select name="role" className="input" defaultValue="STAFF"><option value="STAFF">Staff</option><option value="ADMIN">Admin</option></select>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary">Create account</button>
            <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <p className="text-xs text-smoke sm:col-span-2">Share the password privately and ask them to change it from their account page after signing in.</p>
        </form>
      )}
      <div className="card divide-y divide-line">
        {staff.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1">
              <p className="font-semibold">{m.name}{m.id === meId && <span className="ml-2 text-xs text-smoke">(you)</span>}</p>
              <p className="text-sm text-smoke">{m.email}</p>
            </div>
            <select
              className="input !w-auto !py-1.5"
              value={m.role}
              disabled={m.id === meId}
              onChange={(e) => changeRole(m, e.target.value as Member["role"])}
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
              <option value="CUSTOMER">Remove access</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
