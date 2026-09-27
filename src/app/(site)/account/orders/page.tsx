import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/order-status";
import { ReorderButton } from "@/components/ReorderButton";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await prisma.order.findMany({
    where: { userId: user.id, status: { not: "PENDING_PAYMENT" } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: true },
  });

  if (orders.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-smoke">You haven&apos;t placed any orders yet.</p>
        <Link href="/menu" className="btn-primary mt-4">Order now</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-xl uppercase">{`Order #${o.number}`}</p>
              <p className="text-xs text-smoke">
                {o.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" })}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-smoke">
            {o.items.map((i) => `${i.quantity}× ${i.name}${i.variantName ? ` (${i.variantName})` : ""}`).join(", ")}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="font-semibold">{formatGBP(o.total)}</span>
            <div className="flex gap-2">
              <ReorderButton orderId={o.id} />
              <Link href={`/order/${o.id}`} className="btn-ghost !py-2">View</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
