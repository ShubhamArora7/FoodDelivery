import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { finalizePaidOrder } from "@/lib/orders";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe webhook not configured", { status: 400 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = getStripe().webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe] bad webhook signature", e);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          const order = await prisma.order.findUnique({ where: { id: orderId } });
          if (order && order.total === pi.amount_received) await finalizePaidOrder(orderId);
          else if (order) console.error(`[stripe] amount mismatch for order ${orderId}: ${pi.amount_received} vs ${order.total}`);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await prisma.order.updateMany({
            where: { id: orderId, status: "PENDING_PAYMENT" },
            data: { paymentStatus: "FAILED" },
          });
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (piId) {
          const order = await prisma.order.findUnique({ where: { stripePaymentIntentId: piId } });
          if (order) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                refundedAmount: charge.amount_refunded,
                paymentStatus: charge.amount_refunded >= order.total ? "REFUNDED" : "PARTIALLY_REFUNDED",
              },
            });
          }
        }
        break;
      }
    }
  } catch (e) {
    console.error("[stripe] webhook handler error", e);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}
