import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reconcileWithStripe } from "@/lib/orders";
import { formatGBP } from "@/lib/money";
import { CUSTOMER_STEPS, STATUS_LABEL } from "@/lib/order-status";
import { CheckIcon } from "@/components/Icons";
import { OrderLive } from "./OrderLive";

export const metadata: Metadata = { title: "Your order" };
export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string; redirect_status?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/order/${id}`);

  const piStatus = await reconcileWithStripe(id);
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || (order.userId !== user.id && !isStaff(user))) notFound();

  const pending = order.status === "PENDING_PAYMENT";
  const cancelled = order.status === "CANCELLED";
  const stepIndex = CUSTOMER_STEPS.indexOf(order.status);
  const active = !pending && !cancelled && order.status !== "DELIVERED";
  // "processing" = bank/wallet payments that take a moment to confirm; keep waiting for those.
  const paymentFailed =
    pending &&
    (sp.redirect_status === "failed" ||
      order.paymentStatus === "FAILED" ||
      (sp.placed !== "1" && (piStatus === "requires_payment_method" || piStatus === "canceled")));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <OrderLive active={active || (pending && !paymentFailed)} clearCart={!pending && sp.placed === "1"} interval={pending ? 4000 : 15000} />
      <p className="text-sm uppercase tracking-widest text-smoke">Order #{order.number}</p>
      <h1 className="mt-1 font-display text-4xl font-bold uppercase">
        {pending
          ? paymentFailed
            ? "Payment didn't go through"
            : "Confirming your payment…"
          : cancelled
            ? "Order cancelled"
            : order.status === "DELIVERED"
              ? "Enjoy your meal!"
              : <>Thanks, <span className="flame-text">{order.customerName.split(" ")[0]}</span>!</>}
      </h1>
      {pending && paymentFailed && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          You haven&apos;t been charged. <Link href="/checkout" className="font-semibold underline">Return to checkout</Link> to try again.
        </div>
      )}
      {pending && !paymentFailed && <p className="mt-2 text-smoke">This usually takes a few seconds. This page will update automatically.</p>}
      {cancelled && (
        <p className="mt-2 text-smoke">
          {order.cancelReason ? `${order.cancelReason}. ` : ""}
          {order.paymentStatus === "REFUNDED" || order.paymentStatus === "PARTIALLY_REFUNDED"
            ? `A refund of ${formatGBP(order.refundedAmount)} has been issued to your card.`
            : "If you were charged, please call us."}
        </p>
      )}
      {!pending && !cancelled && order.status !== "DELIVERED" && (
        <p className="mt-2 text-smoke">
          Estimated delivery about {order.estimatedMinutes ?? 45} minutes from when you ordered
          {order.placedAt && ` (${order.placedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })})`}.
          A confirmation has been sent to {order.customerEmail}.
        </p>
      )}

      {!pending && !cancelled && (
        <ol className="card mt-6 grid grid-cols-5 gap-1 p-4">
          {CUSTOMER_STEPS.map((s, i) => {
            const done = i <= stepIndex;
            return (
              <li key={s} className="flex flex-col items-center text-center">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${done ? "border-flame bg-flame" : "border-line"} ${i === stepIndex && active ? "animate-pulse" : ""}`}>
                  {done && <CheckIcon className="h-4 w-4 text-white" />}
                </span>
                <span className={`mt-2 text-[11px] font-semibold uppercase leading-tight sm:text-xs ${done ? "text-cream" : "text-smoke"}`}>{STATUS_LABEL[s]}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-display text-xl uppercase">Items</h2>
          <ul className="divide-y divide-line text-sm">
            {order.items.map((i) => {
              const opts = Array.isArray(i.options) ? (i.options as Array<{ name: string }>).map((o) => o.name) : [];
              return (
                <li key={i.id} className="flex justify-between gap-3 py-2">
                  <div>
                    <p className="font-semibold">{i.quantity} × {i.name}</p>
                    {(i.variantName || opts.length > 0) && <p className="text-xs text-smoke">{[i.variantName, ...opts].filter(Boolean).join(" · ")}</p>}
                    {i.notes && <p className="text-xs italic text-smoke">“{i.notes}”</p>}
                  </div>
                  <span>{formatGBP(i.lineTotal)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-smoke">Subtotal</dt><dd>{formatGBP(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-400"><dt>Discount ({order.discountCode})</dt><dd>-{formatGBP(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-smoke">Delivery</dt><dd>{order.deliveryFee ? formatGBP(order.deliveryFee) : "Free"}</dd></div>
            {order.serviceFee > 0 && <div className="flex justify-between"><dt className="text-smoke">Service fee</dt><dd>{formatGBP(order.serviceFee)}</dd></div>}
            <div className="flex justify-between pt-2 text-base font-bold"><dt>Total</dt><dd className="text-gold">{formatGBP(order.total)}</dd></div>
          </dl>
        </div>
        <div className="card h-fit p-5 text-sm">
          <h2 className="mb-3 font-display text-xl uppercase">Delivering to</h2>
          <p>{order.customerName}</p>
          <p className="text-smoke">{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ""}</p>
          <p className="text-smoke">{order.city} {order.postcode}</p>
          <p className="mt-2 text-smoke">{order.customerPhone}</p>
          {order.deliveryInstructions && <p className="mt-2 italic text-smoke">{order.deliveryInstructions}</p>}
          {order.notes && <p className="mt-2 text-smoke"><span className="text-cream">Notes:</span> {order.notes}</p>}
          <p className="mt-4 text-xs text-smoke">Problem with your order? Call us on 01905 330095.</p>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Link href="/account/orders" className="btn-ghost">My orders</Link>
        <Link href="/menu" className="btn-primary">Order more</Link>
      </div>
    </div>
  );
}
