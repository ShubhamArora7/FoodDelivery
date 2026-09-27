import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ApiError, apiStaff, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { NEXT_STATUSES } from "@/lib/order-status";
import { refundOrder } from "@/lib/refunds";
import { sendStatusEmail } from "@/lib/email";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  await apiStaff();
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new ApiError(404, "Order not found");
  return ok(order);
});

const schema = z.object({
  status: z.enum(["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional(),
  cancelReason: z.string().trim().max(200).optional(),
  estimatedMinutes: z.number().int().min(5).max(240).optional(),
  refundOnCancel: z.boolean().optional().default(true),
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await apiStaff();
  const { id } = await ctx.params;
  const body = await parseBody(req, schema);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new ApiError(404, "Order not found");

  const data: Prisma.OrderUpdateInput = { seenByStaff: true };
  if (body.estimatedMinutes) data.estimatedMinutes = body.estimatedMinutes;

  if (body.status && body.status !== order.status) {
    if (!NEXT_STATUSES[order.status].includes(body.status)) {
      throw new ApiError(400, `Can't change an order from ${order.status} to ${body.status}.`);
    }
    const now = new Date();
    data.status = body.status;
    if (body.status === "ACCEPTED") data.acceptedAt = now;
    if (body.status === "OUT_FOR_DELIVERY") data.outForDeliveryAt = now;
    if (body.status === "DELIVERED") data.deliveredAt = now;
    if (body.status === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelReason = body.cancelReason || "Cancelled by the restaurant";
    }
  }

  // Refund first so a failed refund doesn't leave the order cancelled but charged
  if (body.status === "CANCELLED" && body.refundOnCancel && (order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED")) {
    await refundOrder(order.id);
  }

  const updated = await prisma.order.update({ where: { id }, data, include: { items: true } });
  if (body.status && ["ACCEPTED", "OUT_FOR_DELIVERY", "CANCELLED"].includes(body.status)) {
    await sendStatusEmail(updated);
  }
  return ok(updated);
});
