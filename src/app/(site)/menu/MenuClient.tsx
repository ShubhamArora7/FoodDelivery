"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MenuCategory, MenuProduct } from "@/lib/menu-types";
import { fromPrice } from "@/lib/menu-types";
import { formatGBP } from "@/lib/money";
import { useCart } from "@/store/cart";
import { ProductModal } from "@/components/ProductModal";
import { FlameIcon, LeafIcon, PlusIcon, SearchIcon } from "@/components/Icons";
import { Toast } from "@/components/Toast";
import { useAllergyGate } from "@/components/AllergyAlert";
import { ALLERGY_NOTICE } from "@/lib/copy";

export function MenuClient({ menu }: { menu: MenuCategory[] }) {
  const params = useSearchParams();
  const [active, setActive] = useState(menu[0]?.slug ?? "");
  const [query, setQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const { gate, dialog: allergyDialog } = useAllergyGate();
  const [toast, setToast] = useState<string | null>(null);
  const add = useCart((s) => s.add);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Open an item from a link like /menu?item=<id>
  useEffect(() => {
    const id = params.get("item");
    if (!id) return;
    const p = menu.flatMap((c) => c.products).find((x) => x.id === id);
    if (p) gate(() => setSelected(p));
  }, [params, menu, gate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu
      .map((c) => ({
        ...c,
        products: c.products.filter(
          (p) =>
            (!vegOnly || p.isVegetarian) &&
            (!q || p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)),
        ),
      }))
      .filter((c) => c.products.length > 0);
  }, [menu, query, vegOnly]);

  // Scroll-spy for the category tabs
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    filtered.forEach((c) => {
      const el = document.getElementById(c.slug);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [filtered]);

  useEffect(() => {
    const tab = tabsRef.current?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    tab?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  const quickAdd = (p: MenuProduct) => {
    add({
      productId: p.id,
      variantId: null,
      optionIds: [],
      quantity: 1,
      notes: null,
      name: p.name,
      image: p.image,
      variantName: null,
      optionNames: [],
      unitPrice: p.basePrice,
    });
    setToast(`${p.name} added to your cart`);
  };

  const needsOptions = (p: MenuProduct) => p.variants.length > 0 || p.groups.length > 0;

  return (
    <>
      <div className="sticky top-[72px] z-30 border-b border-line bg-coal/95 backdrop-blur md:top-[101px]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
          <div ref={tabsRef} className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
            {filtered.map((c) => (
              <a
                key={c.id}
                href={`#${c.slug}`}
                data-slug={c.slug}
                className={`shrink-0 rounded-full border px-4 py-1.5 font-display text-sm uppercase tracking-wider transition ${
                  active === c.slug ? "border-flame bg-flame text-white" : "border-line text-cream/80 hover:border-flame/60"
                }`}
              >
                {c.name}
              </a>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="relative flex-1 md:w-56">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
              <input className="input !py-2 pl-9" placeholder="Search the menu" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the menu" />
            </label>
            <button
              onClick={() => setVegOnly((v) => !v)}
              className={`btn !px-3 !py-2 border ${vegOnly ? "border-emerald-500 bg-emerald-900/40 text-emerald-300" : "border-line bg-ember text-cream"}`}
              aria-pressed={vegOnly}
            >
              <LeafIcon className="h-4 w-4" /> Veg
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {filtered.length === 0 && <p className="py-20 text-center text-smoke">No items match your search.</p>}
        {filtered.map((c) => (
          <section key={c.id} id={c.slug} className="scroll-mt-44 pb-12">
            <h2 className="font-display text-3xl font-bold uppercase">{c.name}</h2>
            {c.description && <p className="mt-1 text-sm text-smoke">{c.description}</p>}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.products.map((p) => (
                <article
                  key={p.id}
                  className={`card group relative flex overflow-hidden transition ${p.available ? "cursor-pointer hover:border-flame/60" : "opacity-60"}`}
                  onClick={() => p.available && gate(() => setSelected(p))}
                >
                  <div className="flex min-w-0 flex-1 flex-col p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-display text-lg font-bold uppercase leading-tight">{p.name}</h3>
                      {p.isVegetarian && <LeafIcon className="h-4 w-4 text-emerald-400" />}
                      {p.isSpicy && <FlameIcon className="h-4 w-4 text-chilli" />}
                    </div>
                    {p.badge && <span className="mt-1 w-fit rounded bg-chilli px-1.5 py-0.5 text-[10px] font-bold uppercase">{p.badge}</span>}
                    {p.description && <p className="mt-1.5 line-clamp-3 text-sm text-smoke">{p.description}</p>}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="font-semibold text-gold">
                        {p.variants.length ? "From " : ""}
                        {formatGBP(fromPrice(p))}
                      </span>
                      {p.available ? (
                        <button
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-flame text-white shadow-lg transition group-hover:scale-110"
                          aria-label={`Add ${p.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (needsOptions(p)) gate(() => setSelected(p));
                            else gate(() => quickAdd(p));
                          }}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-xs font-semibold uppercase text-red-400">Sold out</span>
                      )}
                    </div>
                  </div>
                  {p.image && (
                    <div className="relative w-28 shrink-0 sm:w-32">
                      <Image src={p.image} alt="" fill sizes="130px" className="object-cover" />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
        <p className="border-t border-line pt-6 text-xs text-smoke">
          <LeafIcon className="mr-1 inline h-3.5 w-3.5 text-emerald-400" /> Vegetarian
          <FlameIcon className="ml-4 mr-1 inline h-3.5 w-3.5 text-chilli" /> Spicy · All meat is 100% halal. {ALLERGY_NOTICE}{" "}
          <a href="/legal/allergens" className="underline">Allergen information</a>
        </p>
      </div>

      {selected && (
        <ProductModal
          product={selected}
          onClose={() => setSelected(null)}
          onAdded={(name) => {
            setSelected(null);
            setToast(`${name} added to your cart`);
          }}
        />
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
      {allergyDialog}
    </>
  );
}
