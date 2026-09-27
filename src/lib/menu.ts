import "server-only";
import { prisma } from "./db";
import type { MenuCategory } from "./menu-types";

export async function getMenu(): Promise<MenuCategory[]> {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { archived: false },
        orderBy: { sortOrder: "asc" },
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
          modifierGroups: {
            orderBy: { sortOrder: "asc" },
            include: { group: { include: { options: { orderBy: { sortOrder: "asc" } } } } },
          },
        },
      },
    },
  });

  return categories
    .filter((c) => c.products.length > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      products: c.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.image,
        basePrice: p.basePrice,
        badge: p.badge,
        isVegetarian: p.isVegetarian,
        isSpicy: p.isSpicy,
        allergens: p.allergens,
        available: p.available,
        variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price })),
        groups: p.modifierGroups.map(({ group: g }) => ({
          id: g.id,
          name: g.name,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          showWhenOptionId: g.showWhenOptionId,
          options: g.options.map((o) => ({ id: o.id, name: o.name, price: o.price, available: o.available, description: o.description, image: o.image })),
        })),
      })),
    }));
}
