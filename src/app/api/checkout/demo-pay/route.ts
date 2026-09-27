import { z } from "zod";
import { ApiError, apiUser, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { finalizePaidOrder } from "@/lib/orders";
import { demoPaymentsAllowed } from "@/lib/stripe";

// Only works when Stripe keys are NOT configured and demo payments are allowed
// (always in development; in production only with ALLOW_DEMO_PAYMENTS=true).
export const POST = handler(async (req: Request) => {
  if (!demoPaymentsAllowed()) throw new ApiError(404, "Not found");
  const user = await apiUser();
  const { orderId } = await parseBody(req, z.object({ orderId: z.string().min(1) }));
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.status !== "PENDING_PAYMENT") throw new ApiError(409, "This order has already been paid.");
  await finalizePaidOrder(order.id);
  return ok({ ok: true });
});
