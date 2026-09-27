import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { londonDayRange, londonToday } from "@/lib/hours";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/order-status";
import { DayControls } from "./DayControls";

export const metadata = { title: "Daily orders" };
export const dynamic = "force-dynamic";

const IN_PROGRESS = ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY"] as const;

function shiftDay(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const time = (d: Date | null) =>
  d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "";

export default async function DailyOrdersPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const today = londonToday();
  const date = sp.date && londonDayRange(sp.date) ? sp.date : today;
  const range = londonDayRange(date)!;

  const orders = await prisma.order.findMany({
    where: { status: { not: "PENDING_PAYMENT" }, placedAt: { gte: range.start, lt: range.end } },
    include: { items: true },
    orderBy: { placedAt: "asc" },
  });

  // How many orders each customer has placed in total (to spot regulars / first-timers)
  const counts = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: [...new Set(orders.map((o) => o.userId))] }, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
    _count: true,
  });
  const orderCount = new Map(counts.map((c) => [c.userId, c._count]));

  const live = orders.filter((o) => (IN_PROGRESS as readonly string[]).includes(o.status));
  const done = orders.filter((o) => o.status === "DELIVERED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");
  const sales = orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total - o.refundedAmount, 0);
  const itemsSold = orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0);
  const dateLabel = range.start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

  const section = (title: string, list: typeof orders, highlight = false) =>
    list.length > 0 && (
      <section className="space-y-3">
        <h2 className="font-display text-xl uppercase">
          {title} <span className="text-smoke">({list.length})</span>
        </h2>
        {list.map((o) => {
          const address = [o.addressLine1, o.addressLine2, o.city, o.postcode].filter(Boolean).join(", ");
          const tel = o.customerPhone.replace(/\s/g, "");
          const n = orderCount.get(o.userId) ?? 0;
          return (
            <article key={o.id} className={`card break-inside-avoid p-4 ${highlight && o.status === "PLACED" ? "border-chilli" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/orders/${o.id}`} className="font-display text-2xl hover:text-flame-light">#{o.number}</Link>
                <span className="text-sm text-smoke">placed {time(o.placedAt)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                <span className="rounded-full bg-ash px-2.5 py-0.5 text-[11px] font-semibold uppercase text-smoke">
                  {o.paymentStatus.replace("_", " ").toLowerCase()} · {o.paymentMethod}
                </span>
                <span className="ml-auto font-display text-2xl text-gold">{formatGBP(o.total)}</span>
              </div>

              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                {/* Customer */}
                <div className="space-y-1 text-sm">
                  <p className="text-base font-semibold">
                    {o.customerName}
                    <span className="ml-2 rounded bg-ash px-1.5 py-0.5 text-[10px] uppercase text-smoke">
                      {n <= 1 ? "First order" : `${n} orders`}
                    </span>
                  </p>
                  <p className="flex flex-wrap items-center gap-2">
                    <a href={`tel:${tel}`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-600">
                      Call {o.customerPhone}
                    </a>
                    <a href={`sms:${tel}`} className="rounded-lg border border-line px-3 py-1.5 text-smoke hover:text-cream">Text</a>
                  </p>
                  <p><a href={`mailto:${o.customerEmail}`} className="text-smoke hover:text-cream">{o.customerEmail}</a></p>
                  <p className="pt-1 font-semibold">Deliver to</p>
                  <p className="text-smoke">{address}</p>
                  {o.deliveryInstructions && <p className="rounded bg-amber-950/40 px-2 py-1 text-amber-200">Delivery note: {o.deliveryInstructions}</p>}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="no-print inline-block text-flame-light hover:underline"
                  >
                    Open in Google Maps ↗
                  </a>
                </div>

                {/* Order */}
                <div className="text-sm">
                  <ul className="divide-y divide-line/60">
                    {o.items.map((i) => {
                      const opts = Array.isArray(i.options) ? (i.options as Array<{ group: string; name: string; price: number }>) : [];
                      return (
                        <li key={i.id} className="py-1.5">
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold">{i.quantity} × {i.name}{i.variantName ? ` (${i.variantName})` : ""}</span>
                            <span>{formatGBP(i.lineTotal)}</span>
                          </div>
                          {opts.length > 0 && (
                            <ul className="pl-5 text-xs text-smoke">
                              {opts.map((op, k) => (
                                <li key={k}>{op.group}: <span className="text-cream">{op.name}</span>{op.price ? ` (+${formatGBP(op.price)})` : ""}</li>
                              ))}
                            </ul>
                          )}
                          {i.notes && <p className="pl-5 text-xs font-semibold text-amber-300">Item note: “{i.notes}”</p>}
                        </li>
                      );
                    })}
                  </ul>
                  {o.notes && <p className="mt-2 rounded bg-amber-950/40 px-2 py-1.5 font-semibold text-amber-200">Customer note: {o.notes}</p>}
                  <p className="mt-2 text-xs text-smoke">
                    Subtotal {formatGBP(o.subtotal)}
                    {o.discount > 0 && ` · Discount -${formatGBP(o.discount)} (${o.discountCode})`}
                    {` · Delivery ${formatGBP(o.deliveryFee)}`}
                    {o.serviceFee > 0 && ` · Service ${formatGBP(o.serviceFee)}`}
                    {o.refundedAmount > 0 && ` · Refunded ${formatGBP(o.refundedAmount)}`}
                  </p>
                  {o.cancelReason && <p className="mt-1 text-xs text-red-300">Cancelled: {o.cancelReason}</p>}
                  <p className="mt-1 text-xs text-smoke">
                    {o.acceptedAt && `Accepted ${time(o.acceptedAt)} · `}
                    {o.outForDeliveryAt && `Out ${time(o.outForDeliveryAt)} · `}
                    {o.deliveredAt && `Delivered ${time(o.deliveredAt)}`}
                  </p>
                  <div className="no-print mt-2 flex gap-2">
                    <Link href={`/admin/orders/${o.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Manage order</Link>
                    <Link href={`/admin/orders/${o.id}/print`} target="_blank" className="btn-ghost !px-3 !py-1.5 text-xs">Print ticket</Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl uppercase">Daily orders</h1>
        <span className="text-smoke">{dateLabel}</span>
      </div>

      <DayControls date={date} today={today} prev={shiftDay(date, -1)} next={shiftDay(date, 1)} live={date === today} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Orders", String(orders.length)],
          ["In progress", String(live.length)],
          ["Delivered", String(done.length)],
          ["Cancelled", String(cancelled.length)],
          ["Sales", formatGBP(sales)],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-smoke">{k}</p>
            <p className="mt-1 font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-smoke">{itemsSold} items sold · UK time</p>

      {orders.length === 0 && <div className="card p-10 text-center text-smoke">No orders on this day.</div>}
      {section("Upcoming / in progress", live, true)}
      {section("Delivered", done)}
      {section("Cancelled", cancelled)}
    </div>
  );
}
