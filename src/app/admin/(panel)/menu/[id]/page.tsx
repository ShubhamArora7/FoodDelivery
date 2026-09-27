import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/auth";
import { ProductForm, type ProductFormValue } from "./ProductForm";

export const metadata = { title: "Edit item" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await getStaffUser();
  if (user?.role !== "ADMIN") redirect("/admin/menu");
  const { id } = await params;
  const { category } = await searchParams;

  const [categories, groups] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.modifierGroup.findMany({
      orderBy: { name: "asc" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  let value: ProductFormValue;
  if (id === "new") {
    value = {
      id: null,
      categoryId: category ?? categories[0]?.id ?? "",
      name: "",
      description: "",
      image: "",
      basePrice: 0,
      badge: "",
      isVegetarian: false,
      isSpicy: false,
      allergens: "",
      available: true,
      sortOrder: 99,
      variants: [],
      groupIds: [],
    };
  } else {
    const p = await prisma.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { sortOrder: "asc" } }, modifierGroups: { orderBy: { sortOrder: "asc" } } },
    });
    if (!p || p.archived) notFound();
    value = {
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      description: p.description ?? "",
      image: p.image ?? "",
      basePrice: p.basePrice,
      badge: p.badge ?? "",
      isVegetarian: p.isVegetarian,
      isSpicy: p.isSpicy,
      allergens: p.allergens ?? "",
      available: p.available,
      sortOrder: p.sortOrder,
      variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price })),
      groupIds: p.modifierGroups.map((g) => g.groupId),
    };
  }

  return (
    <ProductForm
      initial={value}
      categories={categories}
      groups={groups.map((g) => ({
        id: g.id,
        label: g.internalName || g.name,
        summary: `${g.minSelect > 0 ? "Required" : "Optional"} · ${g.options.map((o) => o.name).join(", ")}`,
      }))}
    />
  );
}
