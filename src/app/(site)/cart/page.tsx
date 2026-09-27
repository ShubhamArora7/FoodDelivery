"use client";

import Link from "next/link";
import Image from "next/image";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatGBP } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";
import { QtyStepper } from "@/components/QtyStepper";
import { TrashIcon } from "@/components/Icons";
import { BasketTotals } from "@/components/CartDrawer";
import { useBasketBill } from "@/components/BasketBill";

export default function CartPage() {
  const { lines, setQty, remove, clear } = useCart();
  const hydrated = useHydrated();
  const { bill } = useBasketBill();
  if (!hydrated) return <div className="mx-auto max-w-4xl px-4 py-16" />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold uppercase">Your <span className="flame-text">cart</span></h1>
      {bill && (
        <div className="mt-5 grid gap-2 rounded-2xl border border-flame/50 bg-gradient-to-r from-flame/20 to-chilli/10 p-4 text-sm sm:grid-cols-3">
          <p><span className="block font-display text-lg uppercase text-flame-light">{formatGBP(bill.deliveryFee)} delivery</span>{bill.promoText || "Delivery fee"}</p>
          <p><span className="block font-display text-lg uppercase text-flame-light">{formatGBP(bill.serviceFee)} service fee</span>Added to every order</p>
          <p><span className="block font-display text-lg uppercase text-flame-light">{bill.deliveryRadiusMiles} mile delivery</span>From our shop at 67 Barbourne Rd, Worcester</p>
        </div>
      )}
      {lines.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-smoke">Your cart is empty.</p>
          <Link href="/menu" className="btn-primary mt-4">Browse the menu</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_360px]">
          <ul className="card divide-y divide-line">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-4 p-4">
                {l.image && <Image src={l.image} alt="" width={80} height={80} className="h-20 w-20 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-display text-lg uppercase">{l.name}</p>
                    <p className="font-semibold">{formatGBP(l.unitPrice * l.quantity)}</p>
                  </div>
                  {(l.variantName || l.optionNames.length > 0) && (
                    <p className="text-sm text-smoke">{[l.variantName, ...l.optionNames].filter(Boolean).join(" · ")}</p>
                  )}
                  {l.notes && <p className="text-sm italic text-smoke">“{l.notes}”</p>}
                  <div className="mt-3 flex items-center gap-4">
                    <QtyStepper value={l.quantity} onChange={(q) => setQty(l.key, q)} small />
                    <span className="text-xs text-smoke">{formatGBP(l.unitPrice)} each</span>
                    <button onClick={() => remove(l.key)} className="ml-auto flex items-center gap-1 text-sm text-red-400 hover:text-red-300">
                      <TrashIcon className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="card h-fit p-5 md:sticky md:top-28">
            <h2 className="mb-4 font-display text-2xl uppercase">Your bill</h2>
            <BasketTotals checkoutLabel="Checkout" />
            <Link href="/menu" className="btn-ghost mt-2 w-full">Add more items</Link>
            <button onClick={clear} className="mt-3 w-full text-center text-xs text-smoke hover:text-red-400">Empty cart</button>
          </aside>
        </div>
      )}
    </div>
  );
}
