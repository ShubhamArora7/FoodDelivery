import { apiAdmin, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/admin-schemas";

export const POST = handler(async (req: Request) => {
  await apiAdmin();
  const body = await parseBody(req, productSchema);
  const product = await prisma.product.create({
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
      variants: { create: body.variants.map((v, i) => ({ name: v.name, price: v.price, sortOrder: i })) },
      modifierGroups: { create: body.groupIds.map((groupId, i) => ({ groupId, sortOrder: i })) },
    },
  });
  return ok(product, { status: 201 });
});
