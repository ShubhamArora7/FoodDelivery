import { z } from "zod";
import { ApiError, apiAdmin, apiStaff, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/admin-schemas";

type Ctx = { params: Promise<{ id: string }> };

/** Staff can mark items sold out / back in stock. */
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await apiStaff();
  const { id } = await ctx.params;
  const { available } = await parseBody(req, z.object({ available: z.boolean() }));
  const product = await prisma.product.update({ where: { id }, data: { available } });
  return ok(product);
});

/** Admins can edit everything. */
export const PUT = handler(async (req: Request, ctx: Ctx) => {
  await apiAdmin();
  const { id } = await ctx.params;
  const body = await parseBody(req, productSchema);
  const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!existing) throw new ApiError(404, "Item not found");

  const keepIds = new Set(body.variants.map((v) => v.id).filter(Boolean) as string[]);
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        categoryId: body.categoryId,
        name: body.name,
        description: body.description || null,
        image: body.image || null,
        basePrice: body.variants.length ? Math.min(...body.variants.map((v) => v.price)) : body.basePrice,
        badge: body.badge || null,
        isVegetarian: body.isVegetarian,
        isSpicy: body.isSpicy,
        allergens: body.allergens || null,
        available: body.available,
        sortOrder: body.sortOrder,
      },
    });
    await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: [...keepIds] } } });
    for (const [i, v] of body.variants.entries()) {
      if (v.id && existing.variants.some((ev) => ev.id === v.id)) {
        await tx.productVariant.update({ where: { id: v.id }, data: { name: v.name, price: v.price, sortOrder: i } });
      } else {
        await tx.productVariant.create({ data: { productId: id, name: v.name, price: v.price, sortOrder: i } });
      }
    }
    await tx.productModifierGroup.deleteMany({ where: { productId: id } });
    if (body.groupIds.length) {
      await tx.productModifierGroup.createMany({
        data: body.groupIds.map((groupId, i) => ({ productId: id, groupId, sortOrder: i })),
      });
    }
  });
  return ok({ ok: true });
});

/** Archive rather than delete, so past orders keep their history. */
export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await apiAdmin();
  const { id } = await ctx.params;
  await prisma.product.update({ where: { id }, data: { archived: true, available: false } });
  return ok({ archived: true });
});
