"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteJSON, postJSON, putJSON } from "@/lib/fetcher";
import { penceToPounds, poundsToPence } from "@/lib/money";

export type ProductFormValue = {
  id: string | null;
  categoryId: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  badge: string;
  isVegetarian: boolean;
  isSpicy: boolean;
  allergens: string;
  available: boolean;
  sortOrder: number;
  variants: Array<{ id?: string; name: string; price: number }>;
  groupIds: string[];
};

type Variant = { id?: string; name: string; price: string };

export function ProductForm({
  initial,
  categories,
  groups,
}: {
  initial: ProductFormValue;
  categories: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; label: string; summary: string }>;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [price, setPrice] = useState(penceToPounds(initial.basePrice));
  const [variants, setVariants] = useState<Variant[]>(initial.variants.map((x) => ({ ...x, price: penceToPounds(x.price) })));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((s) => ({ ...s, [k]: val }));

  function toggleGroup(id: string) {
    set("groupIds", v.groupIds.includes(id) ? v.groupIds.filter((g) => g !== id) : [...v.groupIds, id]);
  }
  function moveGroup(id: string, dir: -1 | 1) {
    const list = [...v.groupIds];
    const i = list.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set("groupIds", list);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedVariants = variants.map((x) => ({ id: x.id, name: x.name.trim(), price: poundsToPence(x.price) }));
    if (parsedVariants.some((x) => x.price === null || !x.name)) return setError("Every size needs a name and a valid price.");
    const base = poundsToPence(price);
    if (!parsedVariants.length && base === null) return setError("Enter a valid price.");

    const body = {
      categoryId: v.categoryId,
      name: v.name,
      description: v.description || null,
      image: v.image || null,
      basePrice: base ?? 0,
      badge: v.badge || null,
      isVegetarian: v.isVegetarian,
      isSpicy: v.isSpicy,
      allergens: v.allergens || null,
      available: v.available,
      sortOrder: Number(v.sortOrder) || 0,
      variants: parsedVariants as Array<{ id?: string; name: string; price: number }>,
      groupIds: v.groupIds,
    };
    setSaving(true);
    const res = v.id ? await putJSON(`/api/admin/products/${v.id}`, body) : await postJSON("/api/admin/products", body);
    setSaving(false);
    if (res.error) return setError(res.error);
    router.push("/admin/menu");
    router.refresh();
  }

  async function archive() {
    if (!v.id || !window.confirm(`Remove ${v.name} from the menu? Past orders are kept.`)) return;
    const res = await deleteJSON(`/api/admin/products/${v.id}`);
    if (res.error) return setError(res.error);
    router.push("/admin/menu");
    router.refresh();
  }

  const selectedGroups = v.groupIds.map((id) => groups.find((g) => g.id === id)).filter((g): g is (typeof groups)[number] => !!g);

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/menu" className="text-sm text-smoke hover:text-cream">← Menu</Link>
        <h1 className="font-display text-3xl uppercase">{v.id ? "Edit item" : "New item"}</h1>
      </div>
      {error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Name</label>
          <input className="input" value={v.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea className="input min-h-20" value={v.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Position in category</label>
          <input className="input" type="number" min={0} value={v.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Image URL</label>
          <input className="input" value={v.image} onChange={(e) => set("image", e.target.value)} placeholder="/images/burger-small.jpg or https://…" />
        </div>
        <div>
          <label className="label">Badge (optional)</label>
          <input className="input" value={v.badge} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. New, Best seller" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Allergens (shown to customers)</label>
          <input className="input" value={v.allergens} onChange={(e) => set("allergens", e.target.value)} placeholder="e.g. Gluten, Milk, Egg, Mustard, Sesame" />
        </div>
        <div className="flex flex-wrap gap-5 text-sm sm:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-orange-500" checked={v.available} onChange={(e) => set("available", e.target.checked)} /> Available</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-orange-500" checked={v.isVegetarian} onChange={(e) => set("isVegetarian", e.target.checked)} /> Vegetarian</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-orange-500" checked={v.isSpicy} onChange={(e) => set("isSpicy", e.target.checked)} /> Spicy</label>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-display text-xl uppercase">Price &amp; sizes</h2>
        {variants.length === 0 ? (
          <div className="max-w-xs">
            <label className="label">Price (£)</label>
            <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        ) : (
          <p className="text-sm text-smoke">This item has sizes, so customers must pick one. The price comes from the size.</p>
        )}
        {variants.map((x, i) => (
          <div key={i} className="flex gap-2">
            <input className="input" placeholder="Size name, e.g. S" value={x.name} onChange={(e) => setVariants((vs) => vs.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
            <input className="input max-w-32" inputMode="decimal" placeholder="£" value={x.price} onChange={(e) => setVariants((vs) => vs.map((y, j) => (j === i ? { ...y, price: e.target.value } : y)))} />
            <button type="button" className="btn-ghost !px-3" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} aria-label="Remove size">✕</button>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => setVariants((vs) => [...vs, { name: "", price: "" }])}>+ Add size</button>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-display text-xl uppercase">Customer choices</h2>
        <p className="text-sm text-smoke">
          Tick the option groups this item uses (flavours, extras, meal upgrade). Manage the groups themselves in{" "}
          <Link href="/admin/options" className="text-flame-light underline">Option groups</Link>.
        </p>
        {selectedGroups.length > 0 && (
          <ol className="space-y-1.5">
            {selectedGroups.map((g, i) => (
              <li key={g.id} className="flex items-center gap-2 rounded-lg border border-flame/40 bg-flame/10 px-3 py-2 text-sm">
                <span className="w-5 text-smoke">{i + 1}.</span>
                <span className="flex-1 font-semibold">{g.label}</span>
                <button type="button" className="px-1 text-smoke hover:text-cream" onClick={() => moveGroup(g.id, -1)} aria-label="Move up">↑</button>
                <button type="button" className="px-1 text-smoke hover:text-cream" onClick={() => moveGroup(g.id, 1)} aria-label="Move down">↓</button>
                <button type="button" className="px-1 text-red-300" onClick={() => toggleGroup(g.id)} aria-label="Remove">✕</button>
              </li>
            ))}
          </ol>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.filter((g) => !v.groupIds.includes(g.id)).map((g) => (
            <button type="button" key={g.id} onClick={() => toggleGroup(g.id)} className="rounded-lg border border-line p-3 text-left text-sm hover:border-flame/60">
              <p className="font-semibold">+ {g.label}</p>
              <p className="line-clamp-1 text-xs text-smoke">{g.summary}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary !px-8" disabled={saving}>{saving ? "Saving…" : "Save item"}</button>
        <Link href="/admin/menu" className="btn-ghost">Cancel</Link>
        {v.id && <button type="button" className="btn-ghost ml-auto !text-red-300" onClick={archive}>Remove from menu</button>}
      </div>
    </form>
  );
}
