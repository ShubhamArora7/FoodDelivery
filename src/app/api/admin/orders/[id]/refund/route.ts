import { z } from "zod";
import { apiAdmin, handler, ok, parseBody } from "@/lib/api";
import { refundOrder } from "@/lib/refunds";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await apiAdmin();
  const { id } = await ctx.params;
  const { amount } = await parseBody(req, z.object({ amount: z.number().int().positive().optional() }));
  const order = await refundOrder(id, amount);
  return ok(order);
});
