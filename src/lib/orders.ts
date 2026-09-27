import "server-only";
import { prisma } from "./db";
import { sendOrderConfirmation } from "./email";

export { STATUS_LABEL, NEXT_STATUSES } from "./order-status";

/**
 * Marks an order as paid and placed. Safe to call more than once (webhook + return page).
 * Returns true if this call did the transition.
 */
export async function finalizePaidOrder(orderId: string): Promise<boolean> {
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING_PAYMENT" },
    data: { status: "PLACED", paymentStatus: "PAID", placedAt: new Date() },
  });
  if (updated.count === 0) return false;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return false;

  if (order.discountId) {
    await prisma.$transaction([
      prisma.discount.update({ where: { id: order.discountId }, data: { usedCount: { increment: 1 } } }),
      prisma.discountRedemption.upsert({
        where: { orderId: order.id },
        update: {},
        create: { discountId: order.discountId, userId: order.userId, orderId: order.id },
      }),
    ]);
  }

  await sendOrderConfirmation(order);
  return true;
}

/**
 * If the webhook hasn't arrived yet (e.g. local dev), check Stripe directly.
 * Returns the PaymentIntent status for an unpaid card order, or null.
 */
export async function reconcileWithStripe(orderId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, total: true, stripePaymentIntentId: true },
  });
  if (!order || order.status !== "PENDING_PAYMENT" || !order.stripePaymentIntentId) return null;
  const { getStripe, stripeEnabled } = await import("./stripe");
  if (!stripeEnabled()) return null;
  try {
    const pi = await getStripe().paymentIntents.retrieve(order.stripePaymentIntentId);
    if (pi.status === "succeeded" && pi.amount_received === order.total) await finalizePaidOrder(orderId);
    return pi.status;
  } catch (e) {
    console.error("[stripe] reconcile failed", e);
    return null;
  }
}
