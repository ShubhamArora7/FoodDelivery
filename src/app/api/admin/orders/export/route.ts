import { apiStaff, handler } from "@/lib/api";
import { prisma } from "@/lib/db";
import { londonDayRange } from "@/lib/hours";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formulas and quote everything
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const GET = handler(async (req: Request) => {
  await apiStaff();
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const orders = await prisma.order.findMany({
    where: {
      status: { not: "PENDING_PAYMENT" },
      createdAt: {
        ...(from && londonDayRange(from) ? { gte: londonDayRange(from)!.start } : {}),
        ...(to && londonDayRange(to) ? { lt: londonDayRange(to)!.end } : {}),
      },
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  const header = ["Order", "Date", "Status", "Payment", "Customer", "Email", "Phone", "Address", "Postcode", "Items", "Subtotal", "Discount", "Code", "Delivery", "Service fee", "Total", "Refunded"];
  const rows = orders.map((o) => [
    o.number,
    o.createdAt.toISOString(),
    o.status,
    o.paymentStatus,
    o.customerName,
    o.customerEmail,
    o.customerPhone,
    [o.addressLine1, o.addressLine2, o.city].filter(Boolean).join(", "),
    o.postcode,
    o.items.map((i) => `${i.quantity}x ${i.name}${i.variantName ? ` (${i.variantName})` : ""}`).join("; "),
    (o.subtotal / 100).toFixed(2),
    (o.discount / 100).toFixed(2),
    o.discountCode ?? "",
    (o.deliveryFee / 100).toFixed(2),
    (o.serviceFee / 100).toFixed(2),
    (o.total / 100).toFixed(2),
    (o.refundedAmount / 100).toFixed(2),
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${from || "all"}-to-${to || "now"}.csv"`,
    },
  });
});
