import { ApiError, apiAdmin, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { groupSchema } from "@/lib/admin-schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: Request, ctx: Ctx) => {
  await apiAdmin();
  const { id } = await ctx.params;
  const body = await parseBody(req, groupSchema);
  const existing = await prisma.modifierGroup.findUnique({ where: { id }, include: { options: true } });
  if (!existing) throw new ApiError(404, "Option group not found");
  if (body.showWhenOptionId && existing.options.some((o) => o.id === body.showWhenOptionId)) {
    throw new ApiError(400, "A group can't depend on one of its own options.");
  }

  const keepIds = new Set(body.options.map((o) => o.id).filter(Boolean) as string[]);
  await prisma.$transaction(async (tx) => {
    await tx.modifierGroup.update({
      where: { id },
      data: {
        name: body.name,
        internalName: body.internalName || null,
        minSelect: body.minSelect,
        maxSelect: body.maxSelect,
        showWhenOptionId: body.showWhenOptionId || null,
      },
    });
    const removed = existing.options.filter((o) => !keepIds.has(o.id)).map((o) => o.id);
    if (removed.length) {
      await tx.modifierOption.deleteMany({ where: { id: { in: removed } } });
      // Groups that depended on a removed option become always-visible
      await tx.modifierGroup.updateMany({ where: { showWhenOptionId: { in: removed } }, data: { showWhenOptionId: null } });
    }
    for (const [i, o] of body.options.entries()) {
      if (o.id && existing.options.some((eo) => eo.id === o.id)) {
        await tx.modifierOption.update({ where: { id: o.id }, data: { name: o.name, price: o.price, available: o.available, sortOrder: i } });
      } else {
        await tx.modifierOption.create({ data: { groupId: id, name: o.name, price: o.price, available: o.available, sortOrder: i } });
      }
    }
  });
  return ok({ ok: true });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await apiAdmin();
  const { id } = await ctx.params;
  const group = await prisma.modifierGroup.findUnique({ where: { id }, include: { options: true, _count: { select: { products: true } } } });
  if (!group) throw new ApiError(404, "Option group not found");
  if (group._count.products > 0) throw new ApiError(400, `Remove this group from its ${group._count.products} item(s) first.`);
  await prisma.$transaction([
    prisma.modifierGroup.updateMany({
      where: { showWhenOptionId: { in: group.options.map((o) => o.id) } },
      data: { showWhenOptionId: null },
    }),
    prisma.modifierGroup.delete({ where: { id } }),
  ]);
  return ok({ deleted: true });
});
