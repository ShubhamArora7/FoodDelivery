"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteJSON, postJSON, putJSON } from "@/lib/fetcher";
import { formatGBP, penceToPounds, poundsToPence } from "@/lib/money";

type Discount = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  onePerCustomer: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
};

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function DiscountForm({ initial, onDone }: { initial?: Discount; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"PERCENT" | "FIXED">(initial?.type ?? "PERCENT");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const rawValue = String(f.get("value") || "");
    const value = type === "PERCENT" ? Math.round(Number(rawValue)) : poundsToPence(rawValue);
    const minSubtotal = poundsToPence(String(f.get("minSubtotal") || "0"));
    if (!value || value < 1) return setError("Enter a discount value.");
    if (minSubtotal === null) return setError("Enter a valid minimum spend.");
    const maxUses = String(f.get("maxUses") || "").trim();
    const body = {
      code: String(f.get("code") || ""),
      description: String(f.get("description") || "") || null,
      type,
      value,
      minSubtotal,
      maxUses: maxUses ? Number(maxUses) : null,
      onePerCustomer: f.get("onePerCustomer") === "on",
      startsAt: f.get("startsAt") ? `${f.get("startsAt")}T00:00:00` : null,
      expiresAt: f.get("expiresAt") ? `${f.get("expiresAt")}T23:59:59` : null,
      active: f.get("active") === "on",
    };
    const res = initial ? await putJSON(`/api/admin/discounts/${initial.id}`, body) : await postJSON("/api/admin/discounts", body);
    if (res.error) return setError(res.error);
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-3">
      {error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300 sm:col-span-3">{error}</p>}
      <div>
        <label className="label">Code</label>
        <input name="code" className="input uppercase" defaultValue={initial?.code} placeholder="SUMMER10" required />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Description (internal)</label>
        <input name="description" className="input" defaultValue={initial?.description ?? ""} placeholder="Leaflet offer, Sept 2026" />
      </div>
      <div>
        <label className="label">Type</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}>
          <option value="PERCENT">Percentage off</option>
          <option value="FIXED">Fixed amount off (£)</option>
        </select>
      </div>
      <div>
        <label className="label">{type === "PERCENT" ? "Percent" : "Amount (£)"}</label>
        <input
          name="value"
          className="input"
          inputMode="decimal"
          defaultValue={initial ? (initial.type === "PERCENT" ? initial.value : penceToPounds(initial.value)) : ""}
          required
        />
      </div>
      <div>
        <label className="label">Minimum spend (£)</label>
        <input name="minSubtotal" className="input" inputMode="decimal" defaultValue={initial ? penceToPounds(initial.minSubtotal) : "0.00"} />
      </div>
      <div>
        <label className="label">Starts (optional)</label>
        <input name="startsAt" type="date" className="input" defaultValue={toDateInput(initial?.startsAt ?? null)} />
      </div>
      <div>
        <label className="label">Expires (optional)</label>
        <input name="expiresAt" type="date" className="input" defaultValue={toDateInput(initial?.expiresAt ?? null)} />
      </div>
      <div>
        <label className="label">Total uses allowed (optional)</label>
        <input name="maxUses" type="number" min={1} className="input" defaultValue={initial?.maxUses ?? ""} placeholder="Unlimited" />
      </div>
      <div className="flex flex-wrap items-center gap-5 text-sm sm:col-span-3">
        <label className="flex items-center gap-2"><input name="onePerCustomer" type="checkbox" className="accent-orange-500" defaultChecked={initial?.onePerCustomer} /> Once per customer</label>
        <label className="flex items-center gap-2"><input name="active" type="checkbox" className="accent-orange-500" defaultChecked={initial?.active ?? true} /> Active</label>
        <div className="ml-auto flex gap-2">
          <button className="btn-primary">Save code</button>
          <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        </div>
      </div>
    </form>
  );
}

export function DiscountManager({ discounts }: { discounts: Discount[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl uppercase">Discount codes</h1>
        {editing !== "new" && <button className="btn-primary ml-auto" onClick={() => setEditing("new")}>+ New code</button>}
      </div>
      {error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
      {editing === "new" && <DiscountForm onDone={() => setEditing(null)} />}
      <div className="space-y-3">
        {discounts.length === 0 && <p className="text-smoke">No discount codes yet.</p>}
        {discounts.map((d) =>
          editing === d.id ? (
            <DiscountForm key={d.id} initial={d} onDone={() => setEditing(null)} />
          ) : (
            <div key={d.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-40">
                <p className="font-mono text-lg font-bold">{d.code}</p>
                <p className="text-xs text-smoke">{d.description}</p>
              </div>
              <p className="font-semibold text-gold">{d.type === "PERCENT" ? `${d.value}% off` : `${formatGBP(d.value)} off`}</p>
              <p className="text-sm text-smoke">
                {d.minSubtotal ? `Min ${formatGBP(d.minSubtotal)} · ` : ""}
                Used {d.usedCount}
                {d.maxUses ? `/${d.maxUses}` : ""}
                {d.onePerCustomer ? " · once per customer" : ""}
                {d.expiresAt ? ` · until ${new Date(d.expiresAt).toLocaleDateString("en-GB")}` : ""}
              </p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${d.active ? "bg-emerald-700 text-white" : "bg-ash text-smoke"}`}>
                {d.active ? "Active" : "Off"}
              </span>
              <div className="ml-auto flex gap-2">
                <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditing(d.id)}>Edit</button>
                <button
                  className="btn-ghost !px-3 !py-1.5 text-xs !text-red-300"
                  onClick={async () => {
                    if (!window.confirm(`Delete code ${d.code}?`)) return;
                    const res = await deleteJSON(`/api/admin/discounts/${d.id}`);
                    if (res.error) setError(res.error);
                    else router.refresh();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
