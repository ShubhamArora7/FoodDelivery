"use client";

import Link from "next/link";
import Image from "next/image";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatGBP } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";
import { QtyStepper } from "@/components/QtyStepper";
import { TrashIcon } from "@/components/Icons";

export default function CartPage() {
  const { lines, setQty, remove, clear } = useCart();
  const hydrated = useHydrated();
  if (!hydrated) return <div className="mx-auto max-w-4xl px-4 py-16" />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold uppercase">Your <span className="flame-text">basket</span></h1>
      {lines.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-smoke">Your basket is empty.</p>
          <Link href="/menu" className="btn-primary mt-4">Browse the menu</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
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
          <aside className="card h-fit p-5">
            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span>{formatGBP(cartSubtotal(lines))}</span>
            </div>
            <p className="mt-1 text-xs text-smoke">Delivery fee and discount codes are applied at checkout.</p>
            <Link href="/checkout" className="btn-primary mt-4 w-full !py-3">Checkout</Link>
            <Link href="/menu" className="btn-ghost mt-2 w-full">Add more items</Link>
            <button onClick={clear} className="mt-3 w-full text-center text-xs text-smoke hover:text-red-400">Empty basket</button>
          </aside>
        </div>
      )}
    </div>
  );
}
