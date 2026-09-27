import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { GroupForm, type GroupValue } from "./GroupForm";

export const metadata = { title: "Option group" };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/admin");
  const { id } = await params;

  const all = await prisma.modifierGroup.findMany({ include: { options: { orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } });

  let value: GroupValue;
  if (id === "new") {
    value = { id: null, name: "", internalName: "", minSelect: 1, maxSelect: 1, showWhenOptionId: null, options: [{ name: "", description: "", image: "", price: 0, available: true }] };
  } else {
    const g = all.find((x) => x.id === id);
    if (!g) notFound();
    value = {
      id: g.id,
      name: g.name,
      internalName: g.internalName ?? "",
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      showWhenOptionId: g.showWhenOptionId,
      options: g.options.map((o) => ({ id: o.id, name: o.name, description: o.description ?? "", image: o.image ?? "", price: o.price, available: o.available })),
    };
  }

  // Options from other groups that this group can depend on
  const triggers = all
    .filter((g) => g.id !== id)
    .flatMap((g) => g.options.map((o) => ({ id: o.id, label: `${g.internalName || g.name} → ${o.name}` })));

  return <GroupForm initial={value} triggers={triggers} />;
}
