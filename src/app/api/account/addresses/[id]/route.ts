import { ApiError, apiUser, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { addressSchema, normalisePostcode } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

async function owned(userId: string, id: string) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new ApiError(404, "Address not found");
  return address;
}

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  await owned(user.id, id);
  const body = await parseBody(req, addressSchema);
  const address = await prisma.$transaction(async (tx) => {
    if (body.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return tx.address.update({
      where: { id },
      data: {
        label: body.label || "Home",
        line1: body.line1,
        line2: body.line2 || null,
        city: body.city,
        postcode: normalisePostcode(body.postcode)!,
        instructions: body.instructions || null,
        ...(body.isDefault ? { isDefault: true } : {}),
      },
    });
  });
  return ok(address);
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const address = await owned(user.id, id);
  await prisma.address.delete({ where: { id } });
  if (address.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return ok({ ok: true });
});
