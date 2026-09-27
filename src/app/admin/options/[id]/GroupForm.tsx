"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteJSON, postJSON, putJSON } from "@/lib/fetcher";
import { penceToPounds, poundsToPence } from "@/lib/money";

export type GroupValue = {
  id: string | null;
  name: string;
  internalName: string;
  minSelect: number;
  maxSelect: number;
  showWhenOptionId: string | null;
  options: Array<{ id?: string; name: string; description: string; image: string; price: number; available: boolean }>;
};

type Opt = { id?: string; name: string; description: string; image: string; price: string; available: boolean };

export function GroupForm({ initial, triggers }: { initial: GroupValue; triggers: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [g, setG] = useState(initial);
  const [options, setOptions] = useState<Opt[]>(initial.options.map((o) => ({ ...o, price: penceToPounds(o.price) })));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateOpt = (i: number, patch: Partial<Opt>) => setOptions((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const move = (i: number, dir: -1 | 1) =>
    setOptions((os) => {
      const j = i + dir;
      if (j < 0 || j >= os.length) return os;
      const copy = [...os];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = options.map((o) => ({ id: o.id, name: o.name.trim(), description: o.description.trim() || null, image: o.image.trim() || null, price: poundsToPence(o.price || "0"), available: o.available }));
    if (parsed.some((o) => o.price === null || !o.name)) return setError("Every option needs a name and a valid price (0 for free).");
    const body = {
      name: g.name,
      internalName: g.internalName || null,
      minSelect: Number(g.minSelect),
      maxSelect: Number(g.maxSelect),
      showWhenOptionId: g.showWhenOptionId || null,
      options: parsed,
    };
    setSaving(true);
    setError(null);
    const res = g.id ? await putJSON(`/api/admin/groups/${g.id}`, body) : await postJSON("/api/admin/groups", body);
    setSaving(false);
    if (res.error) return setError(res.error);
    router.push("/admin/options");
    router.refresh();
  }

  async function remove() {
    if (!g.id || !window.confirm("Delete this option group?")) return;
    const res = await deleteJSON(`/api/admin/groups/${g.id}`);
    if (res.error) return setError(res.error);
    router.push("/admin/options");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/options" className="text-sm text-smoke hover:text-cream">← Option groups</Link>
        <h1 className="font-display text-3xl uppercase">{g.id ? "Edit group" : "New group"}</h1>
      </div>
      {error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label">Title customers see</label>
          <input className="input" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} placeholder="Choose your flavour" required />
        </div>
        <div>
          <label className="label">Admin name (optional)</label>
          <input className="input" value={g.internalName} onChange={(e) => setG({ ...g, internalName: e.target.value })} placeholder="Wing flavours" />
        </div>
        <div>
          <label className="label">Minimum choices</label>
          <input className="input" type="number" min={0} max={20} value={g.minSelect} onChange={(e) => setG({ ...g, minSelect: Number(e.target.value) })} />
          <p className="mt-1 text-xs text-smoke">0 = optional, 1 = customer must pick one</p>
        </div>
        <div>
          <label className="label">Maximum choices</label>
          <input className="input" type="number" min={1} max={20} value={g.maxSelect} onChange={(e) => setG({ ...g, maxSelect: Number(e.target.value) })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Only show when… (optional)</label>
          <select className="input" value={g.showWhenOptionId ?? ""} onChange={(e) => setG({ ...g, showWhenOptionId: e.target.value || null })}>
            <option value="">Always show</option>
            {triggers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <p className="mt-1 text-xs text-smoke">e.g. show a drink choice only when “Make it a meal” is ticked.</p>
        </div>
      </div>

      <div className="card space-y-2 p-5">
        <h2 className="font-display text-xl uppercase">Options</h2>
        {options.map((o, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line/60 p-2">
            <input className="input flex-1" placeholder="Option name" value={o.name} onChange={(e) => updateOpt(i, { name: e.target.value })} />
            <input className="input w-full sm:order-last" placeholder="Extra line shown to customers (optional), e.g. what's included" value={o.description} onChange={(e) => updateOpt(i, { description: e.target.value })} />
            <input className="input w-full sm:order-last" placeholder="Picture URL (optional), e.g. /images/menu/fries.jpg" value={o.image} onChange={(e) => updateOpt(i, { image: e.target.value })} />
            <div className="relative w-28">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-smoke">+£</span>
              <input className="input pl-8" inputMode="decimal" value={o.price} onChange={(e) => updateOpt(i, { price: e.target.value })} aria-label="Extra price" />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-smoke">
              <input type="checkbox" className="accent-orange-500" checked={o.available} onChange={(e) => updateOpt(i, { available: e.target.checked })} /> In stock
            </label>
            <button type="button" className="px-1 text-smoke hover:text-cream" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button type="button" className="px-1 text-smoke hover:text-cream" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button type="button" className="px-1 text-red-300" onClick={() => setOptions((os) => os.filter((_, j) => j !== i))} aria-label="Remove option">✕</button>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => setOptions((os) => [...os, { name: "", description: "", image: "", price: "0.00", available: true }])}>+ Add option</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary !px-8" disabled={saving}>{saving ? "Saving…" : "Save group"}</button>
        <Link href="/admin/options" className="btn-ghost">Cancel</Link>
        {g.id && <button type="button" className="btn-ghost ml-auto !text-red-300" onClick={remove}>Delete group</button>}
      </div>
    </form>
  );
}
