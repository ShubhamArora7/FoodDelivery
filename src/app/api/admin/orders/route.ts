import type { Prisma, OrderStatus } from "@prisma/client";
import { apiStaff, handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

const ACTIVE: OrderStatus[] = ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY"];
const ALL: OrderStatus[] = ["PENDING_PAYMENT", "PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export const GET = handler(async (req: Request) => {
  await apiStaff();
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "active";
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status") as OrderStatus | null;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = 30;

  const where: Prisma.OrderWhereInput = {};
  if (scope === "active") {
    where.status = { in: ACTIVE };
  } else {
    where.status = status && ALL.includes(status) ? status : { not: "PENDING_PAYMENT" };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59`);
    }
    if (q) {
      const n = Number(q.replace(/^#/, ""));
      where.OR = [
        ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
        { customerName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q.replace(/\s/g, "") } },
        { postcode: { contains: q, mode: "insensitive" } },
      ];
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: scope === "active" ? { placedAt: "asc" } : { createdAt: "desc" },
      skip: scope === "active" ? 0 : (page - 1) * pageSize,
      take: scope === "active" ? 200 : pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return ok({ orders, total, page, pageSize });
});
