"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchJSON, postJSON } from "@/lib/fetcher";
import { formatGBP, poundsToPence } from "@/lib/money";
import { NEXT_STATUSES, STATUS_COLOR, STATUS_LABEL, type OrderStatusValue } from "@/lib/order-status";
import { type AdminOrder, itemDetail, ukTime } from "../types";

export function OrderDetail({ order, isAdmin, customerOrderCount }: { order: AdminOrder; isAdmin: boolean; customerOrderCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState("");
  const [eta, setEta] = useState(String(order.estimatedMinutes ?? 45));

  const next = NEXT_STATUSES[order.status].filter((s) => s !== "CANCELLED");
  const canCancel = NEXT_STATUSES[order.status].includes("CANCELLED");
  const refundable = order.total - order.refundedAmount;
  const address = [order.addressLine1, order.addressLine2, order.city, order.postcode].filter(Boolean).join(", ");

  async function update(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await patchJSON(`/api/admin/orders/${order.id}`, body);
    setBusy(false);
    if (res.error) setError(res.error);
    else router.refresh();
    return !res.error;
  }

  async function doRefund() {
    const amount = poundsToPence(refund);
    if (!amount) return setError("Enter a refund amount.");
    if (!window.confirm(`Refund ${formatGBP(amount)} to the customer's card?`)) return;
    setBusy(true);
    setError(null);
    const res = await postJSON(`/api/admin/orders/${order.id}/refund`, { amount });
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setRefund("");
      router.refresh();
    }
  }

  const timeline: Array<[string, string | null]> = [
    ["Placed", order.placedAt],
    ["Accepted", order.acceptedAt],
    ["Out for delivery", order.outForDeliveryAt],
    ["Delivered", order.deliveredAt],
    ["Cancelled", order.cancelledAt],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-smoke hover:text-cream">← Orders</Link>
        <h1 className="font-display text-3xl uppercase">Order #{order.number}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</span>
        <span className="rounded-full bg-ash px-3 py-1 text-xs font-semibold uppercase text-smoke">
          {order.paymentStatus.replace("_", " ")} · {order.paymentMethod}
        </span>
        <Link href={`/admin/orders/${order.id}/print`} target="_blank" className="btn-ghost ml-auto !py-2">Print ticket</Link>
      </div>
      {error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 font-display text-xl uppercase">Items</h2>
            <table className="w-full text-sm">
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className="border-b border-line/60 align-top last:border-0">
                    <td className="w-10 py-2.5 font-bold">{i.quantity}×</td>
                    <td className="py-2.5">
                      <p className="font-semibold">{i.name}</p>
                      {itemDetail(i) && <p className="text-xs text-smoke">{itemDetail(i)}</p>}
                      {i.notes && <p className="text-xs italic text-amber-300">“{i.notes}”</p>}
                    </td>
                    <td className="py-2.5 text-right text-smoke">{formatGBP(i.unitPrice)}</td>
                    <td className="py-2.5 text-right">{formatGBP(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-smoke">Subtotal</dt><dd>{formatGBP(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-400"><dt>Discount ({order.discountCode})</dt><dd>-{formatGBP(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-smoke">Delivery</dt><dd>{formatGBP(order.deliveryFee)}</dd></div>
              {order.serviceFee > 0 && <div className="flex justify-between"><dt className="text-smoke">Service fee</dt><dd>{formatGBP(order.serviceFee)}</dd></div>}
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatGBP(order.total)}</dd></div>
              {order.refundedAmount > 0 && <div className="flex justify-between text-red-300"><dt>Refunded</dt><dd>-{formatGBP(order.refundedAmount)}</dd></div>}
            </dl>
            {order.notes && <p className="mt-3 rounded-lg bg-amber-950/40 p-3 text-sm text-amber-200">Customer note: {order.notes}</p>}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-display text-xl uppercase">Timeline</h2>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span className="text-smoke">Created</span><span>{ukTime(order.createdAt, true)}</span></li>
              {timeline.filter(([, t]) => t).map(([label, t]) => (
                <li key={label} className="flex justify-between"><span className="text-smoke">{label}</span><span>{ukTime(t, true)}</span></li>
              ))}
            </ul>
            {order.cancelReason && <p className="mt-2 text-sm text-red-300">Reason: {order.cancelReason}</p>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card space-y-1 p-5 text-sm">
            <h2 className="mb-2 font-display text-xl uppercase">Customer</h2>
            <p className="font-semibold">{order.customerName}</p>
            <p><a href={`tel:${order.customerPhone}`} className="text-flame-light hover:underline">{order.customerPhone}</a></p>
            <p><a href={`mailto:${order.customerEmail}`} className="text-smoke hover:text-cream">{order.customerEmail}</a></p>
            <p className="text-xs text-smoke">{customerOrderCount} order(s) with us</p>
            <h3 className="pt-3 font-semibold">Deliver to</h3>
            <p className="text-smoke">{address}</p>
            {order.deliveryInstructions && <p className="italic text-amber-200">{order.deliveryInstructions}</p>}
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="inline-block pt-2 text-flame-light hover:underline">
              Open in Google Maps ↗
            </a>
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-display text-xl uppercase">Actions</h2>
            {next.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {next.map((s: OrderStatusValue) => (
                  <button key={s} className="btn-primary" disabled={busy} onClick={() => update({ status: s })}>
                    Mark {STATUS_LABEL[s].toLowerCase()}
                  </button>
                ))}
              </div>
            )}
            {["PLACED", "ACCEPTED", "PREPARING"].includes(order.status) && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="label">Delivery estimate (mins)</label>
                  <input type="number" min={5} max={240} className="input" value={eta} onChange={(e) => setEta(e.target.value)} />
                </div>
                <button className="btn-ghost" disabled={busy} onClick={() => update({ estimatedMinutes: Number(eta) })}>Update</button>
              </div>
            )}
            {canCancel && !cancelling && (
              <button className="btn-ghost w-full !border-red-900 !text-red-300" onClick={() => setCancelling(true)}>Cancel order…</button>
            )}
            {cancelling && (
              <div className="space-y-2 rounded-lg border border-red-900 p-3">
                <label className="label">Reason (shown to customer)</label>
                <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Out of stock / outside delivery area" />
                {order.paymentStatus === "PAID" && <p className="text-xs text-amber-300">The customer will be refunded {formatGBP(refundable)} automatically.</p>}
                <div className="flex gap-2">
                  <button
                    className="btn-danger"
                    disabled={busy}
                    onClick={async () => {
                      if (await update({ status: "CANCELLED", cancelReason: reason || undefined, refundOnCancel: true })) setCancelling(false);
                    }}
                  >
                    Confirm cancel
                  </button>
                  <button className="btn-ghost" onClick={() => setCancelling(false)}>Back</button>
                </div>
              </div>
            )}
            {isAdmin && refundable > 0 && (order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED") && (
              <div className="border-t border-line pt-3">
                <label className="label">Partial refund (£)</label>
                <div className="flex gap-2">
                  <input className="input" inputMode="decimal" placeholder={`max ${(refundable / 100).toFixed(2)}`} value={refund} onChange={(e) => setRefund(e.target.value)} />
                  <button className="btn-ghost" disabled={busy} onClick={doRefund}>Refund</button>
                </div>
              </div>
            )}
            {order.stripePaymentIntentId && isAdmin && (
              <a
                href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-smoke hover:text-cream"
              >
                View payment in Stripe ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
