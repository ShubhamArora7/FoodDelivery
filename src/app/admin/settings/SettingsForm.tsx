"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { putJSON } from "@/lib/fetcher";
import { penceToPounds, poundsToPence } from "@/lib/money";

type Hours = { day: number; open: string; close: string; closed: boolean };
type Value = {
  shopName: string;
  phone: string;
  email: string;
  addressLine: string;
  shopPostcode: string;
  shopLat: number;
  shopLng: number;
  deliveryPostcodes: string;
  deliveryRadiusMiles: number;
  deliveryFee: number;
  deliveryFeeLater: number | null;
  deliveryFeeChangeAt: string | null;
  promoText: string;
  uberEatsUrl: string;
  justEatUrl: string;
  foodhubUrl: string;
  freeDeliveryOver: number;
  minOrder: number;
  serviceFee: number;
  estimatedDeliveryMins: number;
  lastOrderMinsBeforeClose: number;
  orderingPaused: boolean;
  pausedMessage: string;
  openingHours: Hours[];
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONEY_KEYS = ["deliveryFee", "freeDeliveryOver", "minOrder", "serviceFee"] as const;
type MoneyKey = (typeof MONEY_KEYS)[number];

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
      <div>
        <p className="font-semibold">{label}: {ok ? "connected" : "not set up"}</p>
        {!ok && <p className="text-xs text-smoke">{hint}</p>}
      </div>
    </div>
  );
}

export function SettingsForm({
  initial,
  status,
}: {
  initial: Value;
  status: { stripe: boolean; webhook: boolean; email: boolean; appUrl: string };
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [money, setMoney] = useState<Record<MoneyKey, string>>(
    Object.fromEntries(MONEY_KEYS.map((k) => [k, penceToPounds(initial[k])])) as Record<MoneyKey, string>,
  );
  const [feeLater, setFeeLater] = useState(initial.deliveryFeeLater != null ? penceToPounds(initial.deliveryFeeLater) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Value>(k: K, val: Value[K]) => {
    setSaved(false);
    setV((s) => ({ ...s, [k]: val }));
  };
  const setHours = (day: number, patch: Partial<Hours>) =>
    set("openingHours", v.openingHours.map((h) => (h.day === day ? { ...h, ...patch } : h)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed: Partial<Record<MoneyKey, number>> = {};
    for (const k of MONEY_KEYS) {
      const p = poundsToPence(money[k] || "0");
      if (p === null) return setError(`Invalid amount for ${k}`);
      parsed[k] = p;
    }
    const later = feeLater.trim() ? poundsToPence(feeLater) : null;
    if (feeLater.trim() && later === null) return setError("Invalid amount for the later delivery fee");
    if ((later === null) !== !v.deliveryFeeChangeAt) return setError("Set both the new delivery fee and the date it starts, or leave both blank.");
    setSaving(true);
    setError(null);
    const res = await putJSON("/api/admin/settings", {
      ...v,
      ...parsed,
      deliveryFeeLater: later,
      deliveryFeeChangeAt: v.deliveryFeeChangeAt ? `${v.deliveryFeeChangeAt}T00:00:00` : null,
      shopLat: Number(v.shopLat),
      shopLng: Number(v.shopLng),
      deliveryRadiusMiles: Number(v.deliveryRadiusMiles),
      estimatedDeliveryMins: Number(v.estimatedDeliveryMins),
      lastOrderMinsBeforeClose: Number(v.lastOrderMinsBeforeClose),
    });
    setSaving(false);
    if (res.error) setError(res.error);
    else {
      setSaved(true);
      router.refresh();
    }
  }

  const moneyInput = (k: MoneyKey, label: string, hint?: string) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-smoke">£</span>
        <input className="input pl-7" inputMode="decimal" value={money[k]} onChange={(e) => { setSaved(false); setMoney((m) => ({ ...m, [k]: e.target.value })); }} />
      </div>
      {hint && <p className="mt-1 text-xs text-smoke">{hint}</p>}
    </div>
  );

  // Monday first
  const orderedDays = [...v.openingHours.slice(1), v.openingHours[0]];

  return (
    <form onSubmit={save} className="max-w-4xl space-y-5">
      <h1 className="font-display text-3xl uppercase">Settings</h1>

      <div className="card grid gap-3 p-5 sm:grid-cols-2">
        <Status ok={status.stripe} label="Stripe payments" hint="Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to the server environment." />
        <Status ok={status.webhook} label="Stripe webhook" hint="Add STRIPE_WEBHOOK_SECRET so payments are confirmed even if the customer closes the page." />
        <Status ok={status.email} label="Email" hint="Add SMTP settings so customers get confirmations and password resets." />
        <p className="text-sm text-smoke">Site URL: {status.appUrl}</p>
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-xl uppercase">Ordering</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-orange-500" checked={v.orderingPaused} onChange={(e) => set("orderingPaused", e.target.checked)} />
          Pause online ordering
        </label>
        <div>
          <label className="label">Message shown while paused</label>
          <input className="input" value={v.pausedMessage} onChange={(e) => set("pausedMessage", e.target.value)} />
        </div>
        <div>
          <label className="label">Offer banner (home and menu pages)</label>
          <input className="input" value={v.promoText} onChange={(e) => set("promoText", e.target.value)} placeholder="Leave blank for no banner" maxLength={200} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {moneyInput("minOrder", "Minimum order", "Before delivery and discounts")}
          {moneyInput("deliveryFee", "Delivery fee (now)")}
          <div>
            <label className="label">Delivery fee changes to (optional)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-smoke">£</span>
              <input className="input pl-7" inputMode="decimal" value={feeLater} onChange={(e) => { setSaved(false); setFeeLater(e.target.value); }} placeholder="e.g. 2.49" />
            </div>
          </div>
          <div>
            <label className="label">…from this date</label>
            <input type="date" className="input" value={v.deliveryFeeChangeAt ?? ""} onChange={(e) => set("deliveryFeeChangeAt", e.target.value || null)} />
            <p className="mt-1 text-xs text-smoke">For the launch offer: set this 2 months after going live.</p>
          </div>
          {moneyInput("freeDeliveryOver", "Free delivery over", "0 = never free")}
          {moneyInput("serviceFee", "Service fee", "0 = no service fee")}
          <div>
            <label className="label">Delivery estimate (mins)</label>
            <input className="input" type="number" min={5} max={240} value={v.estimatedDeliveryMins} onChange={(e) => set("estimatedDeliveryMins", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Last orders (mins before closing)</label>
            <input className="input" type="number" min={0} max={120} value={v.lastOrderMinsBeforeClose} onChange={(e) => set("lastOrderMinsBeforeClose", Number(e.target.value))} />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-xl uppercase">Delivery area</h2>
        <div>
          <label className="label">Postcode areas you deliver to</label>
          <input className="input uppercase" value={v.deliveryPostcodes} onChange={(e) => set("deliveryPostcodes", e.target.value)} placeholder="WR1, WR2, WR3" />
          <p className="mt-1 text-xs text-smoke">Comma-separated first half of the postcode. Leave blank to allow any postcode within the radius.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Max distance (miles)</label>
            <input className="input" type="number" step="0.1" min={0} value={v.deliveryRadiusMiles} onChange={(e) => set("deliveryRadiusMiles", Number(e.target.value))} />
            <p className="mt-1 text-xs text-smoke">0 = no distance limit</p>
          </div>
          <div>
            <label className="label">Shop latitude</label>
            <input className="input" type="number" step="0.0001" value={v.shopLat} onChange={(e) => set("shopLat", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Shop longitude</label>
            <input className="input" type="number" step="0.0001" value={v.shopLng} onChange={(e) => set("shopLng", Number(e.target.value))} />
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-display text-xl uppercase">Opening hours (UK time)</h2>
        {orderedDays.map((h) => (
          <div key={h.day} className="flex flex-wrap items-center gap-3">
            <span className="w-28 text-sm font-semibold">{DAYS[h.day]}</span>
            <label className="flex items-center gap-1.5 text-sm text-smoke">
              <input type="checkbox" className="accent-orange-500" checked={h.closed} onChange={(e) => setHours(h.day, { closed: e.target.checked })} /> Closed
            </label>
            {!h.closed && (
              <>
                <input type="time" className="input !w-auto !py-1.5" value={h.open} onChange={(e) => setHours(h.day, { open: e.target.value })} />
                <span className="text-smoke">to</span>
                <input type="time" className="input !w-auto !py-1.5" value={h.close} onChange={(e) => setHours(h.day, { close: e.target.value })} />
              </>
            )}
          </div>
        ))}
        <p className="text-xs text-smoke">Closing after midnight is supported (e.g. 17:00 to 02:00).</p>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-3">
        <h2 className="font-display text-xl uppercase sm:col-span-3">Delivery apps</h2>
        <p className="text-xs text-smoke sm:col-span-3">Paste the link to your shop&apos;s page on each app. Leave blank to link to the app&apos;s home page.</p>
        <div><label className="label">Uber Eats link</label><input className="input" value={v.uberEatsUrl} onChange={(e) => set("uberEatsUrl", e.target.value)} placeholder="https://www.ubereats.com/gb/store/..." /></div>
        <div><label className="label">Just Eat link</label><input className="input" value={v.justEatUrl} onChange={(e) => set("justEatUrl", e.target.value)} placeholder="https://www.just-eat.co.uk/restaurants-..." /></div>
        <div><label className="label">Foodhub link</label><input className="input" value={v.foodhubUrl} onChange={(e) => set("foodhubUrl", e.target.value)} placeholder="https://foodhub.co.uk/..." /></div>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-display text-xl uppercase sm:col-span-2">Shop details</h2>
        <div><label className="label">Shop name</label><input className="input" value={v.shopName} onChange={(e) => set("shopName", e.target.value)} /></div>
        <div><label className="label">Phone</label><input className="input" value={v.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div><label className="label">Shop postcode</label><input className="input uppercase" value={v.shopPostcode} onChange={(e) => set("shopPostcode", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Address (shown on site)</label><input className="input" value={v.addressLine} onChange={(e) => set("addressLine", e.target.value)} /></div>
      </section>

      {error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-coal/95 py-3 backdrop-blur">
        <button className="btn-primary !px-8" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
        {saved && <span className="text-sm text-emerald-400">Saved</span>}
      </div>
    </form>
  );
}
