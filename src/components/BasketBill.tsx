"use client";

import { useEffect, useRef, useState } from "react";
import type { Bill } from "@/lib/checkout";
import { formatGBP } from "@/lib/money";
import { postJSON } from "@/lib/fetcher";
import { toApiCart, useCart } from "@/store/cart";

/** Live bill for the basket (works before signing in). */
export function useBasketBill() {
  const lines = useCart((s) => s.lines);
  const discountCode = useCart((s) => s.discountCode);
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const req = useRef(0);
  const key = JSON.stringify(toApiCart(lines)) + "|" + discountCode;

  useEffect(() => {
    if (lines.length === 0) {
      setBill(null);
      setError(null);
      return;
    }
    const id = ++req.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await postJSON<Bill>("/api/cart/quote", { cart: toApiCart(lines), discountCode: discountCode || null });
      if (id !== req.current) return;
      setLoading(false);
      if (res.error) {
        setError(res.error);
        setBill(null);
      } else {
        setError(null);
        setBill(res.data ?? null);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { bill, error, loading };
}

export function DiscountCodeBox({ bill }: { bill: Bill | null }) {
  const { discountCode, setDiscountCode } = useCart();
  const [value, setValue] = useState(discountCode);
  useEffect(() => setValue(discountCode), [discountCode]);

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setDiscountCode(value.trim().toUpperCase());
        }}
      >
        <input
          className="input !py-2 uppercase placeholder:normal-case"
          placeholder="Have a discount code?"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Discount code"
          maxLength={40}
        />
        {discountCode ? (
          <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => { setDiscountCode(""); setValue(""); }}>Remove</button>
        ) : (
          <button className="btn-ghost !px-3 !py-2">Apply</button>
        )}
      </form>
      {discountCode && bill?.discountMessage && (
        <p className={`mt-1.5 text-xs ${bill.discountCode ? "text-emerald-400" : "text-red-400"}`}>{bill.discountMessage}</p>
      )}
    </div>
  );
}

/** Itemised totals: subtotal, discount, delivery (with area & offer notes), service fee, total. */
export function BillLines({ bill, addressChosen = false }: { bill: Bill; addressChosen?: boolean }) {
  const offerEnds = bill.deliveryOfferEnds
    ? new Date(bill.deliveryOfferEnds).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" })
    : null;
  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-smoke">Subtotal</dt>
        <dd>{formatGBP(bill.subtotal)}</dd>
      </div>
      {bill.discount > 0 && (
        <div className="flex justify-between text-emerald-400">
          <dt>Discount ({bill.discountCode})</dt>
          <dd>-{formatGBP(bill.discount)}</dd>
        </div>
      )}
      <div>
        <div className="flex justify-between">
          <dt className="text-smoke">Delivery fee</dt>
          <dd>{bill.deliveryFee === 0 ? "Free" : formatGBP(bill.deliveryFee)}</dd>
        </div>
        <div className="mt-1 rounded-lg bg-coal/70 px-2.5 py-2 text-xs text-smoke">
          {bill.promoText && <p className="font-semibold text-flame-light">{bill.promoText}{offerEnds ? ` (until ${offerEnds})` : ""}</p>}
          {bill.deliveryRadiusMiles > 0 && <p>We deliver within {bill.deliveryRadiusMiles} miles of our shop, 67 Barbourne Rd, Worcester.</p>}
          {!addressChosen && <p>Your address is checked at checkout.</p>}
          {bill.freeDeliveryOver > 0 && bill.deliveryFee > 0 && <p>Free delivery on orders over {formatGBP(bill.freeDeliveryOver)}.</p>}
        </div>
      </div>
      {bill.serviceFee > 0 && (
        <div className="flex justify-between">
          <dt className="text-smoke">Service fee</dt>
          <dd>{formatGBP(bill.serviceFee)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <dt className="text-base font-bold">Total to pay</dt>
        <dd className="font-display text-2xl text-gold">{formatGBP(bill.total)}</dd>
      </div>
      {bill.minOrderError && <p className="rounded-lg bg-amber-900/20 px-2.5 py-2 text-xs text-amber-200">{bill.minOrderError} Add a little more to check out.</p>}
    </dl>
  );
}
