import { z } from "zod";
import { clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { buildBill } from "@/lib/checkout";
import { cartSchema } from "@/lib/validators";

// Cart price preview. Works without signing in so the cart can show the full bill.
// (The delivery address is checked at checkout.)
const schema = z.object({
  cart: cartSchema,
  discountCode: z.string().trim().max(40).nullable().optional(),
});

export const POST = handler(async (req: Request) => {
  rateLimit(`cart-quote:${clientIp(req)}`, 240, 10 * 60 * 1000);
  const body = await parseBody(req, schema);
  const user = await getCurrentUser();
  const bill = await buildBill({ lines: body.cart, userId: user?.id ?? null, discountCode: body.discountCode });
  return ok(bill);
});
