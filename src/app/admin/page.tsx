import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { londonMidnight } from "@/lib/hours";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/order-status";

export const metadata = { title: "Dashboard" };

const PAID = ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export default async function DashboardPage() {
  const today = londonMidnight(0);
  const weekStart = londonMidnight(6);
  const monthStart = londonMidnight(29);

  const [todayAgg, weekOrders, activeCount, recent, topItems, customers] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: [...PAID] }, placedAt: { gte: today } },
      _sum: { total: true, refundedAmount: true },
      _count: true,
      _avg: { total: true },
    }),
    prisma.order.findMany({
      where: { status: { in: [...PAID] }, placedAt: { gte: weekStart } },
      select: { placedAt: true, total: true, refundedAmount: true },
    }),
    prisma.order.count({ where: { status: { in: ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY"] } } }),
    prisma.order.findMany({
      where: { status: { not: "PENDING_PAYMENT" } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.orderItem.groupBy({
      by: ["name"],
      where: { order: { status: { in: [...PAID] }, placedAt: { gte: monthStart } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  // Revenue per day for the last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = londonMidnight(6 - i);
    const next = i < 6 ? londonMidnight(5 - i) : new Date(8.64e15);
    const inDay = weekOrders.filter((o) => o.placedAt && o.placedAt >= start && o.placedAt < next);
    return {
      label: start.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" }),
      revenue: inDay.reduce((s, o) => s + o.total - o.refundedAmount, 0),
      count: inDay.length,
    };
  });
  const maxRevenue = Math.max(1, ...days.map((d) => d.revenue));
  const weekRevenue = days.reduce((s, d) => s + d.revenue, 0);

  const stats = [
    { label: "Orders today", value: String(todayAgg._count) },
    { label: "Sales today", value: formatGBP((todayAgg._sum.total ?? 0) - (todayAgg._sum.refundedAmount ?? 0)) },
    { label: "Average order", value: formatGBP(Math.round(todayAgg._avg.total ?? 0)) },
    { label: "Last 7 days", value: formatGBP(weekRevenue) },
    { label: "Active orders", value: String(activeCount), href: "/admin/orders" },
    { label: "Customers", value: String(customers), href: "/admin/customers" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const inner = (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-smoke">{s.label}</p>
              <p className="mt-1 font-display text-3xl">{s.value}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="card p-4 hover:border-flame/60">{inner}</Link>
          ) : (
            <div key={s.label} className="card p-4">{inner}</div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-display text-xl uppercase">Sales, last 7 days</h2>
          <div className="flex h-48 items-end gap-3">
            {days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] text-smoke">{d.revenue ? formatGBP(d.revenue).replace(".00", "") : ""}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-chilli to-flame-light"
                  style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 150)}px` }}
                  title={`${d.count} orders`}
                />
                <span className="text-xs text-smoke">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-display text-xl uppercase">Top items, last 30 days</h2>
          {topItems.length === 0 ? (
            <p className="text-sm text-smoke">No sales yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {topItems.map((t) => (
                  <tr key={t.name} className="border-b border-line/60 last:border-0">
                    <td className="py-2">{t.name}</td>
                    <td className="py-2 text-right text-smoke">{t._sum.quantity} sold</td>
                    <td className="py-2 text-right">{formatGBP(t._sum.lineTotal ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase">Recent orders</h2>
          <Link href="/admin/orders?tab=history" className="text-sm text-flame-light hover:underline">All orders →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase text-smoke">
              <tr><th className="py-2">Order</th><th>Customer</th><th>Postcode</th><th>Status</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-t border-line/60">
                  <td className="py-2.5"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-flame-light hover:underline">#{o.number}</Link></td>
                  <td>{o.customerName}</td>
                  <td>{o.postcode}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                  <td className="text-right">{formatGBP(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
