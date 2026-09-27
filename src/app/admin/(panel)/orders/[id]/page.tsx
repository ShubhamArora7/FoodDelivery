import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/auth";
import type { AdminOrder } from "../types";
import { OrderDetail } from "./OrderDetail";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, user] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
    getStaffUser(),
  ]);
  if (!order) notFound();
  if (!order.seenByStaff) await prisma.order.update({ where: { id }, data: { seenByStaff: true } });
  const previous = await prisma.order.count({ where: { userId: order.userId, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } } });

  return (
    <OrderDetail
      order={JSON.parse(JSON.stringify(order)) as AdminOrder}
      isAdmin={user?.role === "ADMIN"}
      customerOrderCount={previous}
    />
  );
}
