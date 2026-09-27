import { ApiError, apiAdmin, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { discountSchema } from "@/lib/admin-schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: Request, ctx: Ctx) => {
  await apiAdmin();
  const { id } = await ctx.params;
  const body = await parseBody(req, discountSchema);
  if (body.type === "PERCENT" && body.value > 100) throw new ApiError(400, "Percentage can't be more than 100.");
  const clash = await prisma.discount.findUnique({ where: { code: body.code } });
  if (clash && clash.id !== id) throw new ApiError(409, "That code already exists.");
  const discount = await prisma.discount.update({
    where: { id },
    data: {
      code: body.code,
      description: body.description || null,
      type: body.type,
      value: body.value,
      minSubtotal: body.minSubtotal,
      maxUses: body.maxUses ?? null,
      onePerCustomer: body.onePerCustomer,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      active: body.active,
    },
  });
  return ok(discount);
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await apiAdmin();
  const { id } = await ctx.params;
  await prisma.discount.delete({ where: { id } });
  return ok({ deleted: true });
});
