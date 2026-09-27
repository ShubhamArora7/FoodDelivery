"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MenuGroup, MenuProduct } from "@/lib/menu-types";
import { unitPriceFor, visibleGroups } from "@/lib/menu-types";
import { formatGBP } from "@/lib/money";
import { useCart } from "@/store/cart";
import { CheckIcon, CloseIcon, FlameIcon, LeafIcon } from "./Icons";
import { QtyStepper } from "./QtyStepper";

export function ProductModal({
  product,
  onClose,
  onAdded,
}: {
  product: MenuProduct;
  onClose: () => void;
  onAdded: (name: string) => void;
}) {
  const add = useCart((s) => s.add);
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const groups = useMemo(() => visibleGroups(product, selected), [product, selected]);

  const groupError = (g: MenuGroup): string | null => {
    const n = g.options.filter((o) => selected.has(o.id)).length;
    if (n < g.minSelect) return g.minSelect === 1 ? "Please choose one" : `Please choose at least ${g.minSelect}`;
    return null;
  };
  const errors = groups.map(groupError).filter(Boolean);
  const valid = errors.length === 0 && (product.variants.length === 0 || !!variantId);

  // Only the options from groups that are currently visible count
  const effectiveOptionIds = useMemo(() => {
    const visibleIds = new Set(groups.flatMap((g) => g.options.map((o) => o.id)));
    return [...selected].filter((id) => visibleIds.has(id));
  }, [groups, selected]);

  const unit = unitPriceFor(product, variantId, effectiveOptionIds);

  const toggle = (g: MenuGroup, optionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (g.maxSelect === 1) {
        const wasSelected = next.has(optionId);
        g.options.forEach((o) => next.delete(o.id));
        // radio groups that are optional can be un-ticked
        if (!(wasSelected && g.minSelect === 0)) next.add(optionId);
      } else if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        const count = g.options.filter((o) => next.has(o.id)).length;
        if (count >= g.maxSelect) return prev;
        next.add(optionId);
      }
      return next;
    });
  };

  const submit = () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    const variant = product.variants.find((v) => v.id === variantId) ?? null;
    const optionNames = groups.flatMap((g) => g.options.filter((o) => selected.has(o.id)).map((o) => o.name));
    add({
      productId: product.id,
      variantId: variant?.id ?? null,
      optionIds: effectiveOptionIds,
      quantity: qty,
      notes: notes.trim() || null,
      name: product.name,
      image: product.image,
      variantName: variant?.name ?? null,
      optionNames,
      unitPrice: unit,
    });
    onAdded(product.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal aria-label={product.name}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-coal shadow-2xl sm:rounded-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 hover:bg-black" aria-label="Close">
          <CloseIcon />
        </button>
        <div className="overflow-y-auto">
          {product.image && (
            <div className="relative h-52 w-full">
              <Image src={product.image} alt="" fill sizes="512px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-coal to-transparent" />
            </div>
          )}
          <div className="px-5 pb-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-3xl font-bold uppercase leading-none">{product.name}</h2>
              {product.isVegetarian && <span className="flex items-center gap-1 text-xs text-emerald-400"><LeafIcon className="h-3.5 w-3.5" /> Veg</span>}
              {product.isSpicy && <span className="flex items-center gap-1 text-xs text-red-400"><FlameIcon className="h-3.5 w-3.5" /> Spicy</span>}
            </div>
            {product.description && <p className="mt-2 text-smoke">{product.description}</p>}
            {product.allergens && <p className="mt-2 text-xs text-amber-300">Allergens: {product.allergens}</p>}
          </div>

          {product.variants.length > 0 && (
            <fieldset className="border-t border-line px-5 py-4">
              <legend className="sr-only">Size</legend>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Choose size</h3>
                <span className="rounded bg-ash px-2 py-0.5 text-[10px] font-bold uppercase text-smoke">Required</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    className={`rounded-lg border px-3 py-2.5 text-center transition ${
                      variantId === v.id ? "border-flame bg-flame/15 text-white" : "border-line hover:border-flame/50"
                    }`}
                    aria-pressed={variantId === v.id}
                  >
                    <span className="block font-semibold">{v.name}</span>
                    <span className="block text-sm text-gold">{formatGBP(v.price)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {groups.map((g) => {
            const err = showErrors ? groupError(g) : null;
            const count = g.options.filter((o) => selected.has(o.id)).length;
            return (
              <fieldset key={g.id} className={`border-t px-5 py-4 ${err ? "border-red-600 bg-red-950/20" : "border-line"}`}>
                <legend className="sr-only">{g.name}</legend>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{g.name}</h3>
                    {g.maxSelect > 1 && <p className="text-xs text-smoke">Choose up to {g.maxSelect} · {count} selected</p>}
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${g.minSelect > 0 ? (err ? "bg-red-600 text-white" : "bg-ash text-smoke") : "text-smoke"}`}>
                    {g.minSelect > 0 ? "Required" : "Optional"}
                  </span>
                </div>
                <div className="space-y-2">
                  {g.options.map((o) => {
                    const on = selected.has(o.id);
                    const disabled = !o.available || (!on && g.maxSelect > 1 && count >= g.maxSelect);
                    return (
                      <button
                        type="button"
                        key={o.id}
                        disabled={disabled}
                        onClick={() => toggle(g, o.id)}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition disabled:opacity-40 ${
                          on ? "border-flame bg-flame/10" : "border-line hover:border-flame/50"
                        }`}
                        aria-pressed={on}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center border ${g.maxSelect === 1 ? "rounded-full" : "rounded"} ${
                            on ? "border-flame bg-flame" : "border-smoke/60"
                          }`}
                        >
                          {on && <CheckIcon className="h-3 w-3 text-white" />}
                        </span>
                        <span className="flex-1">{o.name}{!o.available && " (unavailable)"}</span>
                        {o.price > 0 && <span className="text-sm text-gold">+{formatGBP(o.price)}</span>}
                      </button>
                    );
                  })}
                </div>
                {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
              </fieldset>
            );
          })}

          <div className="border-t border-line px-5 py-4">
            <label htmlFor="notes" className="mb-2 block font-semibold">Special requests <span className="font-normal text-smoke">(optional)</span></label>
            <textarea
              id="notes"
              className="input min-h-16"
              maxLength={200}
              placeholder="e.g. no onions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-ember p-4">
          <QtyStepper value={qty} onChange={setQty} />
          <button onClick={submit} className="btn-primary flex-1 !py-3 text-base">
            Add {qty > 1 ? `${qty} ` : ""}to basket · {formatGBP(unit * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
