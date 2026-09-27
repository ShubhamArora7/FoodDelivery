import "server-only";
import { prisma } from "./db";
import { ApiError } from "./api";
import { getStripe, stripeEnabled } from "./stripe";

/** Refunds `amount` pence (default: everything not yet refunded). Returns the updated order. */
export async function refundOrder(orderId: string, amount?: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
    throw new ApiError(400, "This order has no payment to refund.");
  }
  const remaining = order.total - order.refundedAmount;
  const value = amount ?? remaining;
  if (value <= 0 || value > remaining) throw new ApiError(400, `You can refund up to £${(remaining / 100).toFixed(2)}.`);

  if (order.paymentMethod === "card") {
    if (!stripeEnabled() || !order.stripePaymentIntentId) throw new ApiError(400, "Stripe isn't configured, refund this in the Stripe dashboard.");
    try {
      await getStripe().refunds.create(
        { payment_intent: order.stripePaymentIntentId, amount: value },
        { idempotencyKey: `refund-${order.id}-${order.refundedAmount}-${value}` },
      );
    } catch (e) {
      console.error("[stripe] refund failed", e);
      throw new ApiError(502, e instanceof Error ? `Stripe: ${e.message}` : "Stripe refund failed");
    }
  }

  const refundedAmount = order.refundedAmount + value;
  return prisma.order.update({
    where: { id: order.id },
    data: { refundedAmount, paymentStatus: refundedAmount >= order.total ? "REFUNDED" : "PARTIALLY_REFUNDED" },
  });
}
