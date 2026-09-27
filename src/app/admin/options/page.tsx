import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatGBP } from "@/lib/money";

export const metadata = { title: "Option groups" };

export default async function OptionsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/admin");
  const groups = await prisma.modifierGroup.findMany({
    orderBy: { name: "asc" },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      products: { include: { product: { select: { name: true, archived: true } } } },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl uppercase">Option groups</h1>
        <Link href="/admin/options/new" className="btn-primary ml-auto">+ New group</Link>
      </div>
      <p className="text-sm text-smoke">
        Groups are the choices a customer makes when adding an item: flavours, sizes of extras, meal upgrades. One group can be
        used by many items, so changing a price here updates every item that uses it.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => {
          const used = g.products.filter((p) => !p.product.archived);
          return (
            <Link key={g.id} href={`/admin/options/${g.id}`} className="card block p-5 hover:border-flame/60">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xl uppercase">{g.internalName || g.name}</p>
                  <p className="text-xs text-smoke">Customer sees: “{g.name}”</p>
                </div>
                <span className="rounded bg-ash px-2 py-0.5 text-[11px] uppercase text-smoke">
                  {g.minSelect > 0 ? "Required" : "Optional"} · max {g.maxSelect}
                </span>
              </div>
              <p className="mt-2 text-sm">
                {g.options.map((o) => `${o.name}${o.price ? ` +${formatGBP(o.price)}` : ""}${o.available ? "" : " (off)"}`).join(", ")}
              </p>
              <p className="mt-2 text-xs text-smoke">
                Used by {used.length} item{used.length === 1 ? "" : "s"}
                {used.length > 0 && `: ${used.slice(0, 4).map((p) => p.product.name).join(", ")}${used.length > 4 ? "…" : ""}`}
                {g.showWhenOptionId && " · only shown when another option is picked"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
