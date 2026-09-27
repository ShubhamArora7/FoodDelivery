import { ApiError, apiUser, handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** Rebuilds basket lines from a past order using today's menu and prices. */
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const order = await prisma.order.findFirst({ where: { id, userId: user.id }, include: { items: true } });
  if (!order) throw new ApiError(404, "Order not found");

  const productIds = order.items.map((i) => i.productId).filter((x): x is string => !!x);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, archived: false, available: true, category: { active: true } },
    include: {
      variants: true,
      modifierGroups: { include: { group: { include: { options: true } } } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  let skipped = 0;
  for (const item of order.items) {
    const p = item.productId ? byId.get(item.productId) : undefined;
    if (!p) {
      skipped++;
      continue;
    }
    const variant = item.variantName ? p.variants.find((v) => v.name === item.variantName) : null;
    if (p.variants.length > 0 && !variant) {
      skipped++;
      continue;
    }
    const wanted = Array.isArray(item.options) ? (item.options as Array<{ group: string; name: string }>) : [];
    const optionIds: string[] = [];
    const optionNames: string[] = [];
    let unitPrice = variant ? variant.price : p.basePrice;
    let missing = false;
    for (const w of wanted) {
      const g = p.modifierGroups.find((mg) => mg.group.name === w.group)?.group;
      const o = g?.options.find((x) => x.name === w.name && x.available);
      if (!o) {
        missing = true;
        break;
      }
      optionIds.push(o.id);
      optionNames.push(o.name);
      unitPrice += o.price;
    }
    if (missing) {
      skipped++;
      continue;
    }
    lines.push({
      productId: p.id,
      variantId: variant?.id ?? null,
      optionIds,
      quantity: item.quantity,
      notes: item.notes,
      name: p.name,
      image: p.image,
      variantName: variant?.name ?? null,
      optionNames,
      unitPrice,
    });
  }
  return ok({ lines, skipped });
});
