"use client";

import Image from "next/image";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { MenuGroup, MenuOption, MenuProduct } from "@/lib/menu-types";
import { unitPriceFor, visibleGroups } from "@/lib/menu-types";
import { formatGBP } from "@/lib/money";
import { useCart } from "@/store/cart";
import { CheckIcon, CloseIcon, FlameIcon, LeafIcon } from "./Icons";
import { QtyStepper } from "./QtyStepper";
import { ALLERGY_NOTICE } from "@/lib/copy";

type Section = { key: string; title: string; done: boolean; required: boolean };

function Tick({ on, round }: { on: boolean; round: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 transition ${round ? "rounded-full" : "rounded-md"} ${
        on ? "border-flame bg-flame" : "border-smoke/50"
      }`}
    >
      {on && <CheckIcon className="h-3 w-3 text-white" />}
    </span>
  );
}

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
  const scroller = useRef<HTMLDivElement>(null);
  const prevGroupIds = useRef<string[]>([]);

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
  const countIn = (g: MenuGroup) => g.options.filter((o) => selected.has(o.id)).length;
  const groupDone = (g: MenuGroup) => countIn(g) >= g.minSelect;

  // Only options from groups that are currently visible count
  const effectiveOptionIds = useMemo(() => {
    const visibleIds = new Set(groups.flatMap((g) => g.options.map((o) => o.id)));
    return [...selected].filter((id) => visibleIds.has(id));
  }, [groups, selected]);

  const unit = unitPriceFor(product, variantId, effectiveOptionIds);
  const variant = product.variants.find((v) => v.id === variantId) ?? null;

  const sections: Section[] = [
    ...(product.variants.length ? [{ key: "size", title: "Size", done: !!variantId, required: true }] : []),
    ...groups.map((g) => ({
      key: g.id,
      title: g.name.replace(/^Choose your /i, ""),
      done: g.minSelect > 0 ? groupDone(g) : countIn(g) > 0,
      required: g.minSelect > 0,
    })),
  ];
  const firstMissing = sections.find((s) => s.required && !s.done);

  const scrollTo = (key: string) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-section="${key}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // When a new group appears (e.g. the meal drink after ticking "Make it a meal"), bring it into view
  useEffect(() => {
    const ids = groups.map((g) => g.id);
    const added = ids.find((id) => !prevGroupIds.current.includes(id));
    if (prevGroupIds.current.length && added) setTimeout(() => scrollTo(added), 60);
    prevGroupIds.current = ids;
  }, [groups]);

  const toggle = (g: MenuGroup, o: MenuOption) => {
    if (!o.available) return;
    const completedRequired = g.maxSelect === 1 && g.minSelect > 0 && !selected.has(o.id) && countIn(g) === 0;
    setSelected((prev) => {
      const next = new Set(prev);
      if (g.maxSelect === 1) {
        const was = next.has(o.id);
        g.options.forEach((x) => next.delete(x.id));
        if (!(was && g.minSelect === 0)) next.add(o.id);
      } else if (next.has(o.id)) {
        next.delete(o.id);
      } else {
        if (g.options.filter((x) => next.has(x.id)).length >= g.maxSelect) return prev;
        next.add(o.id);
      }
      return next;
    });
    // Move on to the next thing the customer still has to choose
    if (completedRequired) {
      const idx = sections.findIndex((s) => s.key === g.id);
      const nextMissing = sections.slice(idx + 1).find((s) => s.required && !s.done);
      if (nextMissing) setTimeout(() => scrollTo(nextMissing.key), 120);
    }
  };

  const submit = () => {
    if (firstMissing) {
      setShowErrors(true);
      scrollTo(firstMissing.key);
      return;
    }
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

  const chosenLabels = [
    variant?.name,
    ...groups.flatMap((g) => g.options.filter((o) => selected.has(o.id)).map((o) => o.name)),
  ].filter(Boolean) as string[];

  const childGroupsOf = (optionId: string) => groups.filter((cg) => cg.showWhenOptionId === optionId);

  const chooseOne = (g: MenuGroup, optionId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      g.options.forEach((x) => next.delete(x.id));
      if (optionId) next.add(optionId);
      return next;
    });

  // Follow-up choice shown inside the option that unlocked it (e.g. the drink for "Make it a meal")
  const renderChildren = (o: MenuOption) =>
    childGroupsOf(o.id).map((cg) => {
      const current = cg.options.find((x) => selected.has(x.id))?.id ?? "";
      const err = showErrors && !groupDone(cg);
      return (
        <div
          key={cg.id}
          data-section={cg.id}
          className={`scroll-mt-16 rounded-xl border p-3 sm:col-span-2 ${err ? "border-red-600 bg-red-950/30" : "border-flame/60 bg-flame/5"}`}
        >
          <label htmlFor={`sel-${cg.id}`} className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span>{cg.name}</span>
            {cg.minSelect > 0 &&
              (current ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckIcon className="h-3.5 w-3.5" /> Done</span>
              ) : (
                <span className="rounded-full bg-chilli px-2 py-0.5 text-[10px] font-bold uppercase">Required</span>
              ))}
          </label>
          <select
            id={`sel-${cg.id}`}
            className="input mt-2 cursor-pointer !py-3 text-base"
            value={current}
            onChange={(e) => chooseOne(cg, e.target.value)}
          >
            <option value="" disabled={cg.minSelect > 0}>
              {cg.minSelect > 0 ? "Select a drink…" : "None"}
            </option>
            {cg.options.map((x) => (
              <option key={x.id} value={x.id} disabled={!x.available}>
                {x.name}
                {x.price > 0 ? ` (+${formatGBP(x.price)})` : ""}
                {!x.available ? " – unavailable" : ""}
              </option>
            ))}
          </select>
          {err && <p className="mt-1.5 text-xs text-red-300">Please choose your drink to continue.</p>}
        </div>
      );
    });

  const renderOptions = (g: MenuGroup) => {
    const n = countIn(g);
    const full = g.maxSelect > 1 && n >= g.maxSelect;
    const round = g.maxSelect === 1;
    const withImages = g.options.some((o) => o.image);

    if (withImages) {
      return (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {g.options.map((o) => {
            const on = selected.has(o.id);
            const disabled = !o.available || (!on && full);
            return (
              <Fragment key={o.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(g, o)}
                  aria-pressed={on}
                  className={`flex items-center gap-3 rounded-xl border p-2 text-left transition disabled:opacity-40 ${
                    childGroupsOf(o.id).length || g.options.length === 1 ? "sm:col-span-2" : ""
                  } ${on ? "border-flame bg-flame/10 ring-1 ring-flame" : "border-line bg-coal hover:border-flame/60"}`}
                >
                  {o.image && <Image src={o.image} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-tight">{o.name}</span>
                    {o.description && <span className="mt-0.5 block text-xs text-smoke">{o.description}</span>}
                    <span className="mt-1 block text-sm font-semibold text-gold">{o.price ? `+${formatGBP(o.price)}` : "Included"}</span>
                  </span>
                  <Tick on={on} round={round} />
                </button>
                {on && renderChildren(o)}
              </Fragment>
            );
          })}
        </div>
      );
    }

    if (g.options.length > 8) {
      // Long lists (e.g. drinks) as compact tiles
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {g.options.map((o) => {
            const on = selected.has(o.id);
            const disabled = !o.available || (!on && full);
            return (
              <button
                type="button"
                key={o.id}
                disabled={disabled}
                onClick={() => toggle(g, o)}
                aria-pressed={on}
                className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-40 ${
                  on ? "border-flame bg-flame/15 font-semibold text-white ring-1 ring-flame" : "border-line bg-coal hover:border-flame/60"
                }`}
              >
                <span className="leading-tight">
                  {o.name}
                  {o.price > 0 && <span className="block text-xs text-gold">+{formatGBP(o.price)}</span>}
                </span>
                {on && <CheckIcon className="h-4 w-4 shrink-0 text-flame" />}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {g.options.map((o) => {
          const on = selected.has(o.id);
          const disabled = !o.available || (!on && full);
          return (
            <Fragment key={o.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(g, o)}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition disabled:opacity-40 ${
                  on ? "border-flame bg-flame/10 ring-1 ring-flame" : "border-line bg-coal hover:border-flame/60"
                }`}
              >
                <Tick on={on} round={round} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{o.name}{!o.available && " (unavailable)"}</span>
                  {o.description && <span className="mt-0.5 block text-xs text-smoke">{o.description}</span>}
                </span>
                {o.price > 0 && <span className="shrink-0 text-sm font-semibold text-gold">+{formatGBP(o.price)}</span>}
              </button>
              {on && renderChildren(o)}
            </Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal aria-label={product.name}>
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-ember shadow-2xl sm:rounded-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 z-20 rounded-full bg-black/70 p-2 hover:bg-black" aria-label="Close">
          <CloseIcon />
        </button>

        <div ref={scroller} className="overflow-y-auto">
          {/* Header */}
          <div className="relative">
            {product.image && (
              <div className="relative h-48 w-full sm:h-60">
                <Image src={product.image} alt="" fill sizes="672px" className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-ember via-ember/20 to-transparent" />
              </div>
            )}
            <div className={`px-5 pb-3 ${product.image ? "-mt-10 relative" : "pt-5"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-3xl font-bold uppercase leading-none">{product.name}</h2>
                {product.badge && <span className="rounded bg-chilli px-1.5 py-0.5 text-[10px] font-bold uppercase">{product.badge}</span>}
                {product.isVegetarian && <span className="flex items-center gap-1 text-xs text-emerald-400"><LeafIcon className="h-3.5 w-3.5" /> Veg</span>}
                {product.isSpicy && <span className="flex items-center gap-1 text-xs text-red-400"><FlameIcon className="h-3.5 w-3.5" /> Spicy</span>}
              </div>
              {product.description && <p className="mt-2 text-smoke">{product.description}</p>}
              {product.allergens && <p className="mt-2 text-xs text-amber-300">Allergens: {product.allergens}</p>}
            </div>
          </div>

          {/* Step chips */}
          {sections.length > 1 && (
            <div className="no-scrollbar sticky top-0 z-10 flex gap-2 overflow-x-auto border-y border-line bg-ember/95 px-5 py-2.5 backdrop-blur">
              {sections.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => scrollTo(s.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    s.done
                      ? "border-emerald-600 bg-emerald-900/40 text-emerald-300"
                      : showErrors && s.required
                        ? "border-red-600 bg-red-950/50 text-red-300"
                        : "border-line text-smoke hover:text-cream"
                  }`}
                >
                  {s.done ? <CheckIcon className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {s.title}
                  {!s.required && <span className="font-normal opacity-70">(optional)</span>}
                </button>
              ))}
            </div>
          )}

          {/* Size */}
          {product.variants.length > 0 && (
            <section data-section="size" className="scroll-mt-14 border-b border-line px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl uppercase">Choose your size</h3>
                  <p className="text-xs text-smoke">Required · pick 1</p>
                </div>
                {variantId && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400"><CheckIcon className="h-3.5 w-3.5" /> Done</span>}
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {product.variants.map((v) => {
                  const on = variantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      aria-pressed={on}
                      className={`relative rounded-xl border px-3 py-3 text-center transition ${
                        on ? "border-flame bg-flame/15 ring-1 ring-flame" : "border-line bg-coal hover:border-flame/60"
                      }`}
                    >
                      {on && <CheckIcon className="absolute right-2 top-2 h-3.5 w-3.5 text-flame" />}
                      <span className="block font-display text-2xl leading-none">{v.name}</span>
                      <span className="mt-1 block text-sm font-semibold text-gold">{formatGBP(v.price)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Option groups */}
          {groups.filter((g) => !g.showWhenOptionId).map((g) => {
            const n = countIn(g);
            const done = groupDone(g);
            const err = showErrors && !done;
            const rule =
              g.maxSelect === 1 ? (g.minSelect ? "Required · pick 1" : "Optional · pick 1") : `${g.minSelect ? "Required" : "Optional"} · pick up to ${g.maxSelect}`;
            return (
              <section
                key={g.id}
                data-section={g.id}
                className={`scroll-mt-14 border-b px-5 py-5 transition ${err ? "border-red-700 bg-red-950/25" : "border-line"} ${g.showWhenOptionId ? "bg-flame/[0.04]" : ""}`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-xl uppercase">{g.name}</h3>
                    <p className={`text-xs ${err ? "text-red-300" : "text-smoke"}`}>
                      {err ? "Please make a choice" : rule}
                      {g.maxSelect > 1 && n > 0 && ` · ${n} selected`}
                    </p>
                  </div>
                  {g.minSelect > 0 ? (
                    done ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400"><CheckIcon className="h-3.5 w-3.5" /> Done</span>
                    ) : (
                      <span className="rounded-full bg-chilli px-2 py-0.5 text-[10px] font-bold uppercase">Required</span>
                    )
                  ) : null}
                </div>
                {renderOptions(g)}
              </section>
            );
          })}

          {/* Notes */}
          <section className="px-5 py-5">
            <label htmlFor="notes" className="font-display text-xl uppercase">Special instructions</label>
            <p className="mb-2 text-xs text-smoke">Optional · e.g. no onions, sauce on the side</p>
            <textarea id="notes" className="input min-h-16" maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <p className="mt-2 rounded-lg border border-amber-600/40 bg-amber-900/15 px-3 py-2 text-xs text-amber-200">{ALLERGY_NOTICE}</p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-line bg-coal px-4 pb-4 pt-3">
          {chosenLabels.length > 0 && (
            <p className="mb-2 line-clamp-2 text-xs text-smoke">
              <span className="font-semibold text-cream">Your choices:</span> {chosenLabels.join(" · ")}
            </p>
          )}
          <div className="flex items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} />
            <button onClick={submit} className={`btn-primary flex-1 !py-3.5 text-base ${firstMissing ? "opacity-90" : ""}`}>
              {firstMissing ? `Choose ${firstMissing.title.toLowerCase()} to continue` : `Add ${qty > 1 ? `${qty} ` : ""}to cart · ${formatGBP(unit * qty)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
