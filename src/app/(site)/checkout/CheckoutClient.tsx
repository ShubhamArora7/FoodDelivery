"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Bill } from "@/lib/checkout";
import { useCart, toApiCart } from "@/store/cart";
import { useHydrated } from "@/lib/use-hydrated";
import { postJSON } from "@/lib/fetcher";
import { formatGBP } from "@/lib/money";
import { AddressBook, type Address } from "@/components/AddressBook";
import { FormError } from "@/components/AuthCard";
import { ALLERGY_NOTICE } from "@/lib/copy";
import { AllergyDialog } from "@/components/AllergyAlert";
import { BillLines, DiscountCodeBox } from "@/components/BasketBill";

type PaymentMode = "stripe" | "demo" | "off";
type Created = { orderId: string; total: number; clientSecret?: string | null; demo: boolean };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 md:p-6">
      <h2 className="mb-4 flex items-center gap-3 font-display text-2xl uppercase">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flame text-base">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function StripePayButton({ orderId, total, onError }: { orderId: string; total: number; onError: (m: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setPaying(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/order/${orderId}?placed=1` },
    });
    // Only reached if there's an immediate error (otherwise Stripe redirects)
    if (error) onError(error.message || "Payment failed. Please try another card.");
    setPaying(false);
  }

  return (
    <>
      <PaymentElement options={{ layout: "tabs" }} />
      <button className="btn-primary mt-5 w-full !py-3.5 text-base" disabled={!stripe || paying} onClick={pay}>
        {paying ? "Processing…" : `Pay ${formatGBP(total)}`}
      </button>
    </>
  );
}

export function CheckoutClient({
  user,
  paymentMode,
  publishableKey,
}: {
  user: { name: string; email: string; phone: string };
  paymentMode: PaymentMode;
  publishableKey: string;
}) {
  const hydrated = useHydrated();
  const { lines, discountCode } = useCart();
  const [address, setAddress] = useState<Address | null>(null);
  const [phone, setPhone] = useState(user.phone);
  const [notes, setNotes] = useState("");
  const [bill, setBill] = useState<Bill | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAllergy, setShowAllergy] = useState(false);
  const reqId = useRef(0);

  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  const cartKey = JSON.stringify(toApiCart(lines));

  // Live price quote from the server whenever the basket, address or code changes
  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    const id = ++reqId.current;
    setLoadingQuote(true);
    postJSON<Bill>("/api/checkout/quote", {
      cart: toApiCart(lines),
      addressId: address?.id ?? null,
      discountCode: discountCode || null,
    }).then((res) => {
      if (id !== reqId.current) return;
      setLoadingQuote(false);
      if (res.error) {
        setQuoteError(res.error);
        setBill(null);
      } else {
        setQuoteError(null);
        setBill(res.data ?? null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, cartKey, address?.id, discountCode]);

  // Changing anything after the order was created means we need a fresh one
  useEffect(() => {
    setCreated(null);
  }, [cartKey, address?.id, discountCode]);

  if (!hydrated) return <div className="mx-auto max-w-6xl px-4 py-16" />;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl uppercase">Your basket is empty</h1>
        <Link href="/menu" className="btn-primary mt-6">Browse the menu</Link>
      </div>
    );
  }

  const blocking = bill?.closedMessage || bill?.minOrderError || bill?.deliveryError || quoteError;

  async function continueToPayment() {
    setError(null);
    if (!address) return setError("Please choose or add a delivery address.");
    if (!phone.trim()) return setError("Please enter a phone number for the driver.");
    setSubmitting(true);
    const res = await postJSON<Created>("/api/checkout/create", {
      cart: toApiCart(lines),
      addressId: address.id,
      discountCode: discountCode || null,
      phone: phone.trim(),
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (res.error || !res.data) return setError(res.error || "Couldn't create your order.");
    setCreated(res.data);
  }

  async function payDemo() {
    if (!created) return;
    setSubmitting(true);
    const res = await postJSON("/api/checkout/demo-pay", { orderId: created.orderId });
    if (res.error) {
      setSubmitting(false);
      return setError(res.error);
    }
    window.location.assign(`/order/${created.orderId}?placed=1`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {showAllergy && (
        <AllergyDialog
          acceptLabel="I understand, continue"
          onAccept={() => {
            setShowAllergy(false);
            continueToPayment();
          }}
          onCancel={() => setShowAllergy(false)}
        />
      )}
      <h1 className="font-display text-4xl font-bold uppercase">Checkout</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Step n={1} title="Delivery address">
            <AddressBook selectable selectedId={address?.id ?? null} onSelect={setAddress} />
            {bill?.deliveryError && <FormError message={bill.deliveryError} />}
          </Step>

          <Step n={2} title="Contact & notes">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input className="input opacity-70" value={user.name} readOnly />
              </div>
              <div>
                <label className="label" htmlFor="phone">Phone for the driver</label>
                <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07123 456789" required />
              </div>
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="notes">Order notes <span className="normal-case">(optional)</span></label>
              <textarea id="notes" className="input min-h-20" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know about your order" />
              <p className="mt-2 rounded-lg border border-amber-600/40 bg-amber-900/15 px-3 py-2 text-sm text-amber-200">{ALLERGY_NOTICE}</p>
            </div>
          </Step>

          <Step n={3} title="Payment">
            {paymentMode === "off" ? (
              <FormError message="Online payments aren't available right now. Please call us to order." />
            ) : !created ? (
              <>
                <p className="mb-4 text-sm text-smoke">
                  {paymentMode === "stripe"
                    ? "Pay securely by card, Apple Pay, Google Pay or the other options shown on the next step. Payments are handled by Stripe and your card details never touch our servers."
                    : "Demo mode: Stripe keys aren't configured, so no real payment is taken."}
                </p>
                <FormError message={error} />
                <button
                  className="btn-primary mt-3 w-full !py-3.5 text-base"
                  disabled={submitting || loadingQuote || !bill?.canPlaceOrder || !!blocking}
                  onClick={() => setShowAllergy(true)}
                >
                  {submitting ? "Creating your order…" : bill ? `Continue to payment · ${formatGBP(bill.total)}` : "Continue to payment"}
                </button>
              </>
            ) : created.demo ? (
              <>
                <p className="mb-3 rounded-lg border border-amber-600/50 bg-amber-900/20 p-3 text-sm text-amber-200">
                  Demo payment: this marks the order as paid without charging anything. Add Stripe keys to take real payments.
                </p>
                <FormError message={error} />
                <button className="btn-primary mt-2 w-full !py-3.5 text-base" disabled={submitting} onClick={payDemo}>
                  {submitting ? "Placing order…" : `Place order (demo) · ${formatGBP(created.total)}`}
                </button>
              </>
            ) : created.clientSecret && stripePromise ? (
              <>
                <FormError message={error} />
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: created.clientSecret,
                    appearance: {
                      theme: "night",
                      variables: { colorPrimary: "#ff6a13", colorBackground: "#0b0806", borderRadius: "8px", fontFamily: "Inter, system-ui, sans-serif" },
                    },
                  }}
                >
                  <StripePayButton orderId={created.orderId} total={created.total} onError={setError} />
                </Elements>
              </>
            ) : (
              <FormError message="Payment couldn't load. Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set." />
            )}
          </Step>
        </div>

        {/* SUMMARY */}
        <aside className="card h-fit p-5 lg:sticky lg:top-28">
          <h2 className="mb-3 font-display text-2xl uppercase">Your order</h2>
          <ul className="divide-y divide-line text-sm">
            {(bill?.items ?? []).map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3 py-2.5">
                <div>
                  <p className="font-semibold">{i.quantity} × {i.name}</p>
                  {(i.variantName || i.options.length > 0) && (
                    <p className="text-xs text-smoke">{[i.variantName, ...i.options.map((o) => o.name)].filter(Boolean).join(" · ")}</p>
                  )}
                  {i.notes && <p className="text-xs italic text-smoke">“{i.notes}”</p>}
                </div>
                <span className="shrink-0">{formatGBP(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {!bill && !quoteError && <p className="py-4 text-sm text-smoke">Calculating…</p>}
          <FormError message={quoteError} />
          {quoteError?.includes("no longer on the menu") && (
            <button className="btn-ghost mt-2 w-full" onClick={() => useCart.getState().clear()}>
              Empty basket and start again
            </button>
          )}

          <div className="mt-4">
            <DiscountCodeBox bill={bill} />
          </div>
          {bill && (
            <div className="mt-4 border-t border-line pt-4">
              <BillLines bill={bill} addressChosen={!!address} />
              <p className="pt-2 text-xs text-smoke">Estimated delivery: about {bill.estimatedMinutes} minutes.</p>
            </div>
          )}
          {bill?.closedMessage && <FormError message={bill.closedMessage} />}
          <Link href="/menu" className="mt-4 block text-center text-sm text-flame-light hover:underline">Add more items</Link>
        </aside>
      </div>
    </div>
  );
}
