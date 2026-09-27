import type { OrderStatusValue } from "@/lib/order-status";

export type AdminOrderItem = {
  id: string;
  name: string;
  variantName: string | null;
  options: Array<{ group: string; name: string; price: number }>;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  notes: string | null;
};

export type AdminOrder = {
  id: string;
  number: number;
  status: OrderStatusValue;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postcode: string;
  deliveryInstructions: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  discountCode: string | null;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  refundedAmount: number;
  estimatedMinutes: number | null;
  placedAt: string | null;
  acceptedAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  items: AdminOrderItem[];
};

export function itemDetail(i: AdminOrderItem): string {
  return [i.variantName, ...(Array.isArray(i.options) ? i.options.map((o) => o.name) : [])].filter(Boolean).join(" · ");
}

export function minutesAgo(iso: string | null): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

export function ukTime(iso: string | null, withDate = false): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    ...(withDate ? { dateStyle: "short", timeStyle: "short" } : { hour: "2-digit", minute: "2-digit" }),
  });
}
