import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MenuManager, type AdminCategory } from "./MenuManager";

export const metadata = { title: "Menu" };

export default async function AdminMenuPage() {
  const [categories, user] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          where: { archived: false },
          orderBy: { sortOrder: "asc" },
          include: { variants: { orderBy: { sortOrder: "asc" } }, _count: { select: { modifierGroups: true } } },
        },
      },
    }),
    getCurrentUser(),
  ]);

  const data: AdminCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    image: c.image,
    sortOrder: c.sortOrder,
    active: c.active,
    products: c.products.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      available: p.available,
      price: p.basePrice,
      variants: p.variants.map((v) => ({ name: v.name, price: v.price })),
      groupCount: p._count.modifierGroups,
    })),
  }));

  return <MenuManager categories={data} isAdmin={user?.role === "ADMIN"} />;
}
