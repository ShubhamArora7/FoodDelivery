import { ApiError, apiAdmin, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { categorySchema } from "@/lib/admin-schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await apiAdmin();
  const { id } = await ctx.params;
  const body = await parseBody(req, categorySchema.partial());
  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description || null } : {}),
      ...(body.image !== undefined ? { image: body.image || null } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    },
  });
  return ok(category);
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await apiAdmin();
  const { id } = await ctx.params;
  const count = await prisma.product.count({ where: { categoryId: id, archived: false } });
  if (count > 0) throw new ApiError(400, "Move or delete the items in this category first, or just hide it.");
  const archived = await prisma.product.count({ where: { categoryId: id } });
  if (archived > 0) {
    // Keep history intact: hide instead of deleting
    await prisma.category.update({ where: { id }, data: { active: false } });
    return ok({ hidden: true });
  }
  await prisma.category.delete({ where: { id } });
  return ok({ deleted: true });
});
