"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatGBP } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";
import { CartIcon, CloseIcon } from "./Icons";
import { QtyStepper } from "./QtyStepper";
import { BillLines, DiscountCodeBox, useBasketBill } from "./BasketBill";

export function BasketTotals({ onNavigate, checkoutLabel = "Go to checkout" }: { onNavigate?: () => void; checkoutLabel?: string }) {
  const { bill, error } = useBasketBill();
  const subtotal = cartSubtotal(useCart((st) => st.lines));
  return (
    <div className="space-y-4">
      <DiscountCodeBox bill={bill} />
      {bill ? (
        <BillLines bill={bill} />
      ) : (
        <div className="flex justify-between text-sm">
          <span className="text-smoke">Subtotal</span>
          <span>{formatGBP(subtotal)}</span>
        </div>
      )}
      {error && (
        <p className="rounded-lg bg-red-950/50 px-2.5 py-2 text-xs text-red-300">
          {error}{" "}
          {error.includes("no longer on the menu") && (
            <button className="underline" onClick={() => useCart.getState().clear()}>Empty basket</button>
          )}
        </p>
      )}
      <Link href="/checkout" className="btn-primary w-full !py-3 text-base" onClick={onNavigate}>
        {checkoutLabel}
      </Link>
    </div>
  );
}

export function CartDrawer() {
  const { lines, open, setOpen, setQty } = useCart();
  const hydrated = useHydrated();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname, setOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (!hydrated) return null;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-coal shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Your basket"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-2xl uppercase">Your basket</h2>
          <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-ember" aria-label="Close basket">
            <CloseIcon />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-smoke">
            <CartIcon className="h-14 w-14 text-line" />
            <p>Your basket is empty.</p>
            <Link href="/menu" className="btn-primary" onClick={() => setOpen(false)}>Browse the menu</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-4">
                  {l.image && (
                    <Image src={l.image} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="font-semibold leading-tight">{l.name}</p>
                      <p className="shrink-0 font-semibold">{formatGBP(l.unitPrice * l.quantity)}</p>
                    </div>
                    {(l.variantName || l.optionNames.length > 0) && (
                      <p className="mt-0.5 text-xs text-smoke">{[l.variantName, ...l.optionNames].filter(Boolean).join(" · ")}</p>
                    )}
                    {l.notes && <p className="mt-0.5 text-xs italic text-smoke">“{l.notes}”</p>}
                    <div className="mt-2">
                      <QtyStepper value={l.quantity} onChange={(q) => setQty(l.key, q)} small allowZero />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="max-h-[55vh] overflow-y-auto border-t border-line p-5">
              {open && <BasketTotals onNavigate={() => setOpen(false)} />}
              <Link href="/cart" className="mt-2 block text-center text-sm text-smoke hover:text-cream" onClick={() => setOpen(false)}>
                View full basket
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
