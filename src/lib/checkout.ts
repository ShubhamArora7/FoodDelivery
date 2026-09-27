import "server-only";
import type { Discount } from "@prisma/client";
import { prisma } from "./db";
import { ApiError } from "./api";
import { currentDeliveryFee, getSettings } from "./settings";
import { checkDelivery } from "./delivery";
import { priceCart, type CartInput, type PricedLine } from "./pricing";
import { formatGBP } from "./money";

export type Bill = {
  items: PricedLine[];
  subtotal: number;
  discount: number;
  discountCode: string | null;
  discountId: string | null;
  discountMessage: string | null;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  postcode: string | null;
  deliveryError: string | null;
  minOrder: number;
  minOrderError: string | null;
  isOpen: boolean;
  closedMessage: string | null;
  estimatedMinutes: number;
  canPlaceOrder: boolean;
  // Shown to customers next to the delivery fee
  deliveryRadiusMiles: number;
  deliveryOfferEnds: string | null;
  promoText: string;
  freeDeliveryOver: number;
};

async function evaluateDiscount(
  code: string,
  subtotal: number,
  userId: string | null,
): Promise<{ discount: Discount; amount: number } | { error: string }> {
  const discount = await prisma.discount.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!discount || !discount.active) return { error: "That code isn't valid." };
  if (discount.startsAt && discount.startsAt > now) return { error: "That code isn't active yet." };
  if (discount.expiresAt && discount.expiresAt < now) return { error: "That code has expired." };
  if (discount.maxUses != null && discount.usedCount >= discount.maxUses) return { error: "That code has been fully used." };
  if (subtotal < discount.minSubtotal) {
    return { error: `Spend ${formatGBP(discount.minSubtotal)} or more to use this code.` };
  }
  if (discount.onePerCustomer && userId) {
    const used = await prisma.discountRedemption.findFirst({ where: { discountId: discount.id, userId } });
    if (used) return { error: "You've already used this code." };
  }
  const raw = discount.type === "PERCENT" ? Math.round((subtotal * discount.value) / 100) : discount.value;
  return { discount, amount: Math.min(raw, subtotal) };
}

/** Builds the full bill for a cart. Used both for the live preview and when creating the order. */
export async function buildBill(opts: {
  lines: CartInput;
  userId: string | null;
  postcode?: string | null;
  discountCode?: string | null;
}): Promise<Bill> {
  const settings = await getSettings();
  const { items, subtotal } = await priceCart(opts.lines);

  let discount = 0;
  let discountCode: string | null = null;
  let discountId: string | null = null;
  let discountMessage: string | null = null;
  if (opts.discountCode?.trim()) {
    const r = await evaluateDiscount(opts.discountCode, subtotal, opts.userId);
    if ("error" in r) discountMessage = r.error;
    else {
      discount = r.amount;
      discountCode = r.discount.code;
      discountId = r.discount.id;
      discountMessage = `${r.discount.code} applied: -${formatGBP(r.amount)}`;
    }
  }

  let deliveryFee = currentDeliveryFee(settings);
  let postcode: string | null = null;
  let deliveryError: string | null = null;
  if (opts.postcode) {
    const d = await checkDelivery(settings, opts.postcode, subtotal);
    if (d.ok) {
      deliveryFee = d.fee;
      postcode = d.postcode;
    } else deliveryError = d.reason;
  } else if (settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver) {
    deliveryFee = 0;
  }

  const minOrderError =
    subtotal < settings.minOrder ? `Minimum order for delivery is ${formatGBP(settings.minOrder)}.` : null;

  // Open unless staff have paused ordering in the admin panel (no automatic closing by the clock).
  const open = !settings.orderingPaused;
  const closedMessage = open ? null : settings.pausedMessage || "We're closed right now.";

  const total = Math.max(0, subtotal - discount + deliveryFee + settings.serviceFee);

  return {
    items,
    subtotal,
    discount,
    discountCode,
    discountId,
    discountMessage,
    deliveryFee,
    serviceFee: settings.serviceFee,
    total,
    postcode,
    deliveryError,
    minOrder: settings.minOrder,
    minOrderError,
    isOpen: open,
    closedMessage,
    estimatedMinutes: settings.estimatedDeliveryMins,
    canPlaceOrder: open && !minOrderError && !!postcode && !deliveryError,
    deliveryRadiusMiles: settings.deliveryRadiusMiles,
    deliveryOfferEnds:
      settings.deliveryFeeChangeAt && settings.deliveryFeeLater != null && settings.deliveryFeeChangeAt > new Date()
        ? settings.deliveryFeeChangeAt.toISOString()
        : null,
    promoText: settings.promoText,
    freeDeliveryOver: settings.freeDeliveryOver,
  };
}

export function assertCanOrder(bill: Bill) {
  if (bill.closedMessage) throw new ApiError(409, bill.closedMessage);
  if (bill.minOrderError) throw new ApiError(400, bill.minOrderError);
  if (bill.deliveryError) throw new ApiError(400, bill.deliveryError);
  if (!bill.postcode) throw new ApiError(400, "Please choose a delivery address.");
  if (bill.total < 30) throw new ApiError(400, "Order total is too low to take a card payment.");
}
