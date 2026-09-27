"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteJSON, patchJSON, postJSON } from "@/lib/fetcher";
import { formatGBP } from "@/lib/money";

export type AdminCategory = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  active: boolean;
  products: Array<{
    id: string;
    name: string;
    image: string | null;
    available: boolean;
    price: number;
    variants: Array<{ name: string; price: number }>;
    groupCount: number;
  }>;
};

function CategoryHeader({ c, isAdmin, onError }: { c: AdminCategory; isAdmin: boolean; onError: (m: string) => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [description, setDescription] = useState(c.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(c.sortOrder));

  async function save(extra: Record<string, unknown> = {}) {
    const res = await patchJSON(`/api/admin/categories/${c.id}`, {
      name,
      description: description || null,
      sortOrder: Number(sortOrder) || 0,
      ...extra,
    });
    if (res.error) onError(res.error);
    else {
      setEditing(false);
      router.refresh();
    }
  }

  if (editing) {
    return (
      <div className="grid gap-2 p-4 sm:grid-cols-[1fr_2fr_90px_auto]">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Category name" />
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
        <input className="input" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label="Position" title="Position" />
        <div className="flex gap-2">
          <button className="btn-primary !py-2" onClick={() => save()}>Save</button>
          <button className="btn-ghost !py-2" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <h2 className="font-display text-2xl uppercase">{c.name}</h2>
      {!c.active && <span className="rounded bg-ash px-2 py-0.5 text-xs uppercase text-smoke">Hidden</span>}
      <span className="text-sm text-smoke">{c.products.length} items</span>
      {isAdmin && (
        <div className="ml-auto flex flex-wrap gap-2 text-sm">
          <Link href={`/admin/menu/new?category=${c.id}`} className="btn-primary !px-3 !py-1.5">+ Add item</Link>
          <button className="btn-ghost !px-3 !py-1.5" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-ghost !px-3 !py-1.5" onClick={() => save({ active: !c.active })}>{c.active ? "Hide" : "Show"}</button>
          <button
            className="btn-ghost !px-3 !py-1.5 !text-red-300"
            onClick={async () => {
              if (!window.confirm(`Delete the ${c.name} category?`)) return;
              const res = await deleteJSON(`/api/admin/categories/${c.id}`);
              if (res.error) onError(res.error);
              else router.refresh();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function MenuManager({ categories, isAdmin }: { categories: AdminCategory[]; isAdmin: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");

  async function toggle(id: string, available: boolean) {
    setBusy(id);
    const res = await patchJSON(`/api/admin/products/${id}`, { available });
    setBusy(null);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl uppercase">Menu</h1>
        <p className="text-sm text-smoke">
          {isAdmin ? "Edit items, prices and sizes. Use the switch to mark items sold out." : "Use the switch to mark items sold out or back in stock."}
        </p>
      </div>
      {error && (
        <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300" onClick={() => setError(null)}>{error}</p>
      )}

      {categories.map((c) => (
        <section key={c.id} className="card overflow-hidden">
          <CategoryHeader c={c} isAdmin={isAdmin} onError={setError} />
          <div className="divide-y divide-line border-t border-line">
            {c.products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                {p.image ? (
                  <Image src={p.image} alt="" width={44} height={44} className="h-11 w-11 rounded-md object-cover" />
                ) : (
                  <div className="h-11 w-11 rounded-md bg-ash" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${p.available ? "" : "text-smoke line-through"}`}>{p.name}</p>
                  <p className="truncate text-xs text-smoke">
                    {p.variants.length ? p.variants.map((v) => `${v.name} ${formatGBP(v.price)}`).join(" · ") : formatGBP(p.price)}
                    {p.groupCount > 0 && ` · ${p.groupCount} option group${p.groupCount > 1 ? "s" : ""}`}
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-smoke">
                  <span className="hidden sm:inline">{p.available ? "Available" : "Sold out"}</span>
                  <button
                    role="switch"
                    aria-checked={p.available}
                    disabled={busy === p.id}
                    onClick={() => toggle(p.id, !p.available)}
                    className={`relative h-6 w-11 rounded-full transition ${p.available ? "bg-emerald-600" : "bg-zinc-700"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${p.available ? "left-5" : "left-0.5"}`} />
                  </button>
                </label>
                {isAdmin && <Link href={`/admin/menu/${p.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Edit</Link>}
              </div>
            ))}
            {c.products.length === 0 && <p className="px-4 py-6 text-sm text-smoke">No items yet.</p>}
          </div>
        </section>
      ))}

      {isAdmin && (
        <form
          className="card flex flex-wrap gap-2 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newCat.trim()) return;
            const res = await postJSON("/api/admin/categories", { name: newCat.trim() });
            if (res.error) setError(res.error);
            else {
              setNewCat("");
              router.refresh();
            }
          }}
        >
          <input className="input max-w-sm" placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button className="btn-primary">Add category</button>
        </form>
      )}
    </div>
  );
}
