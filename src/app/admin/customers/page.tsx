import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page || 1));
  const pageSize = 40;

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    email: { not: { endsWith: "@deleted.invalid" } },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/\s/g, "") } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        marketingOptIn: true,
        createdAt: true,
        addresses: { where: { isDefault: true }, select: { postcode: true }, take: 1 },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const stats = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
    _count: true,
    _sum: { total: true },
    _max: { placedAt: true },
  });
  const byUser = new Map(stats.map((s) => [s.userId, s]));
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl uppercase">Customers</h1>
        <span className="text-sm text-smoke">{total} registered</span>
        <form className="ml-auto flex gap-2">
          <input name="q" defaultValue={q} className="input !py-2" placeholder="Name, email or phone" />
          <button className="btn-primary !py-2">Search</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-smoke">
            <tr><th className="p-3">Name</th><th>Contact</th><th>Postcode</th><th>Orders</th><th>Spent</th><th>Last order</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const s = byUser.get(u.id);
              return (
                <tr key={u.id} className="border-b border-line/50">
                  <td className="p-3 font-semibold">
                    {u.name}
                    {u.marketingOptIn && <span className="ml-2 rounded bg-ash px-1.5 py-0.5 text-[10px] uppercase text-smoke">Marketing</span>}
                  </td>
                  <td>
                    <a href={`mailto:${u.email}`} className="block hover:text-flame-light">{u.email}</a>
                    {u.phone && <a href={`tel:${u.phone.replace(/\s/g, "")}`} className="text-xs font-semibold text-emerald-400 hover:underline">Call {u.phone}</a>}
                  </td>
                  <td>{u.addresses[0]?.postcode ?? "–"}</td>
                  <td>
                    {s?._count ? (
                      <Link href={`/admin/orders?tab=history&q=${encodeURIComponent(u.email)}`} className="text-flame-light hover:underline">{s._count} · view</Link>
                    ) : (
                      0
                    )}
                  </td>
                  <td>{formatGBP(s?._sum.total ?? 0)}</td>
                  <td className="text-smoke">{s?._max.placedAt ? s._max.placedAt.toLocaleDateString("en-GB") : "–"}</td>
                  <td className="text-smoke">{u.createdAt.toLocaleDateString("en-GB")}</td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-smoke">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn-ghost !py-1.5" href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>Previous</Link>}
          <span className="text-smoke">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-ghost !py-1.5" href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>Next</Link>}
        </div>
      )}
    </div>
  );
}
