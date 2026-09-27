import "server-only";
import { z } from "zod";
import { prisma } from "./db";
import { ApiError } from "./api";
import { cartSchema } from "./validators";

export type CartInput = z.infer<typeof cartSchema>;

export type PricedOption = { group: string; name: string; price: number };

export type PricedLine = {
  productId: string;
  name: string;
  variantName: string | null;
  options: PricedOption[];
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  notes: string | null;
};

/**
 * Re-prices a cart from the database. Never trust prices sent by the browser.
 * Validates sizes, required choices, min/max selections and availability.
 */
export async function priceCart(lines: CartInput): Promise<{ items: PricedLine[]; subtotal: number }> {
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      category: true,
      variants: true,
      modifierGroups: { include: { group: { include: { options: true } } }, orderBy: { sortOrder: "asc" } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: PricedLine[] = [];
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || product.archived || !product.category.active) {
      throw new ApiError(409, "An item in your cart is no longer on the menu. Please remove it and try again.");
    }
    if (!product.available) {
      throw new ApiError(409, `${product.name} is sold out right now. Please remove it from your cart.`);
    }

    let unitPrice = product.basePrice;
    let variantName: string | null = null;
    if (product.variants.length > 0) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant) throw new ApiError(400, `Please choose a size for ${product.name}.`);
      unitPrice = variant.price;
      variantName = variant.name;
    }

    const selected = new Set(line.optionIds);
    const options: PricedOption[] = [];
    const usedOptionIds = new Set<string>();

    for (const { group } of product.modifierGroups) {
      const active = !group.showWhenOptionId || selected.has(group.showWhenOptionId);
      const chosen = group.options.filter((o) => selected.has(o.id));
      if (!active) {
        // Ignore choices from a hidden conditional group
        chosen.forEach((o) => usedOptionIds.add(o.id));
        continue;
      }
      if (chosen.length < group.minSelect) {
        throw new ApiError(400, `${product.name}: ${group.name.toLowerCase()} is required.`);
      }
      if (chosen.length > group.maxSelect) {
        throw new ApiError(400, `${product.name}: choose up to ${group.maxSelect} for ${group.name.toLowerCase()}.`);
      }
      for (const o of chosen) {
        if (!o.available) throw new ApiError(409, `${o.name} is unavailable right now.`);
        usedOptionIds.add(o.id);
        options.push({ group: group.name, name: o.name, price: o.price });
        unitPrice += o.price;
      }
    }

    for (const id of selected) {
      if (!usedOptionIds.has(id)) throw new ApiError(400, `An option for ${product.name} is no longer available.`);
    }

    items.push({
      productId: product.id,
      name: product.name,
      variantName,
      options,
      unitPrice,
      quantity: line.quantity,
      lineTotal: unitPrice * line.quantity,
      notes: line.notes?.trim() || null,
    });
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return { items, subtotal };
}
