import { apiStaff, handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

/** Polled by the admin every few seconds to ring for new orders. */
export const GET = handler(async () => {
  await apiStaff();
  const [newCount, latest] = await Promise.all([
    prisma.order.count({ where: { status: "PLACED" } }),
    prisma.order.findFirst({
      where: { status: { notIn: ["PENDING_PAYMENT"] }, placedAt: { not: null } },
      orderBy: { placedAt: "desc" },
      select: { id: true, number: true, placedAt: true, total: true, customerName: true },
    }),
  ]);
  return ok({ newCount, latest });
});
