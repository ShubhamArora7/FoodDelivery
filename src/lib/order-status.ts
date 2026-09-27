// Shared between server and client components.
export type OrderStatusValue =
  | "PENDING_PAYMENT"
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export const STATUS_LABEL: Record<OrderStatusValue, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PLACED: "Order placed",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** Allowed next statuses from each status (used by the admin). */
export const NEXT_STATUSES: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PLACED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "OUT_FOR_DELIVERY", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const CUSTOMER_STEPS: OrderStatusValue[] = ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];

export const STATUS_COLOR: Record<OrderStatusValue, string> = {
  PENDING_PAYMENT: "bg-zinc-700 text-zinc-200",
  PLACED: "bg-red-600 text-white",
  ACCEPTED: "bg-amber-500 text-black",
  PREPARING: "bg-orange-500 text-black",
  OUT_FOR_DELIVERY: "bg-sky-500 text-black",
  DELIVERED: "bg-emerald-600 text-white",
  CANCELLED: "bg-zinc-800 text-zinc-400",
};
