"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getJSON, patchJSON } from "@/lib/fetcher";
import { formatGBP } from "@/lib/money";
import { STATUS_COLOR, STATUS_LABEL, type OrderStatusValue } from "@/lib/order-status";
import { type AdminOrder, itemDetail, minutesAgo, ukTime } from "./types";

type ListResponse = { orders: AdminOrder[]; total: number; page: number; pageSize: number };

const COLUMNS: Array<{ status: OrderStatusValue; title: string; next?: OrderStatusValue; action?: string }> = [
  { status: "PLACED", title: "New", next: "ACCEPTED", action: "Accept" },
  { status: "ACCEPTED", title: "Accepted", next: "PREPARING", action: "Start preparing" },
  { status: "PREPARING", title: "Preparing", next: "OUT_FOR_DELIVERY", action: "Out for delivery" },
  { status: "OUT_FOR_DELIVERY", title: "On the way", next: "DELIVERED", action: "Delivered" },
];

function ActiveBoard() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const res = await getJSON<ListResponse>("/api/admin/orders?scope=active");
    if (res.error) setError(res.error);
    else {
      setError(null);
      setOrders(res.data!.orders);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      load();
      setTick((x) => x + 1);
    }, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function advance(o: AdminOrder, status: OrderStatusValue) {
    setBusy(o.id);
    const res = await patchJSON(`/api/admin/orders/${o.id}`, { status });
    setBusy(null);
    if (res.error) setError(res.error);
    await load();
  }

  if (!orders) return <p className="text-smoke">Loading orders…</p>;

  return (
    <>
      {error && <p className="mb-3 rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="rounded-2xl border border-line bg-ember/50 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 font-display text-lg uppercase">
                {col.title}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${list.length ? STATUS_COLOR[col.status] : "bg-ash text-smoke"}`}>{list.length}</span>
              </h2>
              <div className="space-y-3">
                {list.length === 0 && <p className="px-1 py-6 text-center text-sm text-smoke">Nothing here</p>}
                {list.map((o) => (
                  <article key={o.id} className={`rounded-xl border bg-coal p-3 ${col.status === "PLACED" ? "border-chilli shadow-lg shadow-red-900/30" : "border-line"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/orders/${o.id}`} className="font-display text-xl hover:text-flame-light">#{o.number}</Link>
                      <div className="text-right text-xs text-smoke">
                        <p>{ukTime(o.placedAt)}</p>
                        <p className={col.status === "PLACED" ? "font-semibold text-red-300" : ""}>{minutesAgo(o.placedAt)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{o.customerName}</p>
                    <p className="text-xs text-smoke">{o.postcode} · <a href={`tel:${o.customerPhone}`} className="hover:text-cream">{o.customerPhone}</a></p>
                    <ul className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
                      {o.items.map((i) => (
                        <li key={i.id}>
                          <span className="font-semibold">{i.quantity}×</span> {i.name}
                          {itemDetail(i) && <span className="block pl-5 text-xs text-smoke">{itemDetail(i)}</span>}
                          {i.notes && <span className="block pl-5 text-xs italic text-amber-300">“{i.notes}”</span>}
                        </li>
                      ))}
                    </ul>
                    {o.notes && <p className="mt-2 rounded bg-amber-950/40 p-2 text-xs text-amber-200">Note: {o.notes}</p>}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-semibold">{formatGBP(o.total)}</span>
                      <div className="flex gap-1.5">
                        <Link href={`/admin/orders/${o.id}/print`} target="_blank" className="btn-ghost !px-2.5 !py-1.5 text-xs">Print</Link>
                        {col.next && (
                          <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={busy === o.id} onClick={() => advance(o, col.next!)}>
                            {busy === o.id ? "…" : col.action}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function History() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    const params = new URLSearchParams({ scope: "history", page: String(p) });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await getJSON<ListResponse>(`/api/admin/orders?${params}`);
    if (res.error) setError(res.error);
    else {
      setError(null);
      setData(res.data!);
    }
  }, [q, status, from, to]);

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const exportUrl = `/api/admin/orders/export?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`;

  return (
    <div className="space-y-4">
      <form
        className="card flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load(1);
        }}
      >
        <div className="min-w-48 flex-1">
          <label className="label">Search</label>
          <input className="input" placeholder="Order #, name, email, phone, postcode" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {(["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "PENDING_PAYMENT"] as OrderStatusValue[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn-primary">Search</button>
        <a href={exportUrl} className="btn-ghost">Export CSV</a>
      </form>
      {error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-smoke">
            <tr>
              <th className="p-3">Order</th><th>Date</th><th>Customer</th><th>Postcode</th><th>Items</th><th>Status</th><th>Payment</th><th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data?.orders.map((o) => (
              <tr key={o.id} className="border-b border-line/50 hover:bg-ash/40">
                <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-flame-light hover:underline">#{o.number}</Link></td>
                <td className="whitespace-nowrap">{ukTime(o.placedAt ?? o.createdAt, true)}</td>
                <td>{o.customerName}<span className="block text-xs text-smoke">{o.customerPhone}</span></td>
                <td>{o.postcode}</td>
                <td className="max-w-56 truncate text-smoke">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                <td><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                <td className="text-xs text-smoke">{o.paymentStatus.replace("_", " ").toLowerCase()}</td>
                <td className="p-3 text-right">{formatGBP(o.total)}</td>
              </tr>
            ))}
            {data && data.orders.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-smoke">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button className="btn-ghost !py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-smoke">Page {page} of {pages} · {data.total} orders</span>
          <button className="btn-ghost !py-1.5" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

export function OrdersBoard() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "history" ? "history" : "active";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl uppercase">Orders</h1>
        <div className="flex rounded-lg border border-line p-1">
          {(["active", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => router.replace(t === "active" ? "/admin/orders" : "/admin/orders?tab=history")}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold capitalize ${tab === t ? "bg-flame text-white" : "text-smoke hover:text-cream"}`}
            >
              {t === "active" ? "Live board" : "All orders"}
            </button>
          ))}
        </div>
      </div>
      {tab === "active" ? <ActiveBoard /> : <History />}
    </div>
  );
}
