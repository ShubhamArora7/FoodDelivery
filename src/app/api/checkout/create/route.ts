import { z } from "zod";
import { ApiError, apiUser, clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assertCanOrder, buildBill } from "@/lib/checkout";
import { cartSchema, phoneSchema } from "@/lib/validators";
import { demoPaymentsAllowed, getStripe, stripeEnabled } from "@/lib/stripe";

const schema = z.object({
  cart: cartSchema,
  addressId: z.string().min(1, "Please choose a delivery address"),
  discountCode: z.string().trim().max(40).nullable().optional(),
  // Normally taken from the customer's profile; only needed if the profile has none
  phone: phoneSchema.optional().nullable(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const POST = handler(async (req: Request) => {
  const user = await apiUser();
  rateLimit(`checkout:${user.id}`, 20, 10 * 60 * 1000);
  rateLimit(`checkout-ip:${clientIp(req)}`, 40, 10 * 60 * 1000);
  const body = await parseBody(req, schema);

  if (!stripeEnabled() && !demoPaymentsAllowed()) {
    throw new ApiError(503, "Online payments aren't set up yet. Please call us to order.");
  }

  const address = await prisma.address.findFirst({ where: { id: body.addressId, userId: user.id } });
  if (!address) throw new ApiError(404, "Please choose a delivery address.");

  const bill = await buildBill({ lines: body.cart, userId: user.id, postcode: address.postcode, discountCode: body.discountCode, fresh: true });
  assertCanOrder(bill);
  if (body.discountCode?.trim() && !bill.discountCode) {
    throw new ApiError(400, bill.discountMessage || "That discount code can't be used.");
  }

  const phone = user.phone || body.phone;
  if (!phone) throw new ApiError(400, "Please add a phone number so our driver can reach you.");
  // Save the phone number to the profile if they didn't have one
  if (!user.phone) await prisma.user.update({ where: { id: user.id }, data: { phone } });

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: phone,
      addressLine1: address.line1,
      addressLine2: address.line2,
      city: address.city,
      postcode: bill.postcode!,
      deliveryInstructions: address.instructions,
      notes: body.notes || null,
      subtotal: bill.subtotal,
      discount: bill.discount,
      discountCode: bill.discountCode,
      discountId: bill.discountId,
      deliveryFee: bill.deliveryFee,
      serviceFee: bill.serviceFee,
      total: bill.total,
      estimatedMinutes: bill.estimatedMinutes,
      paymentMethod: stripeEnabled() ? "card" : "demo",
      items: {
        create: bill.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          variantName: i.variantName,
          options: i.options,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
          notes: i.notes,
        })),
      },
    },
  });

  if (!stripeEnabled()) {
    return ok({ orderId: order.id, total: order.total, demo: true });
  }

  try {
    const intent = await getStripe().paymentIntents.create(
      {
        amount: order.total,
        currency: "gbp",
        automatic_payment_methods: { enabled: true },
        receipt_email: user.email,
        description: `Flame Grill & Chill order #${order.number}`,
        metadata: { orderId: order.id, orderNumber: String(order.number), userId: user.id },
      },
      { idempotencyKey: `order-${order.id}` },
    );
    await prisma.order.update({ where: { id: order.id }, data: { stripePaymentIntentId: intent.id } });
    return ok({ orderId: order.id, total: order.total, clientSecret: intent.client_secret, demo: false });
  } catch (e) {
    console.error("[stripe] create payment intent failed", e);
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Payment setup failed" } });
    throw new ApiError(502, "We couldn't start the payment. Please try again.");
  }
});
