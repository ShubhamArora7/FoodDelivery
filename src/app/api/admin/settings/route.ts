import { z } from "zod";
import { apiAdmin, apiStaff, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { normalisePostcode } from "@/lib/validators";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");
const pence = z.number().int().min(0).max(100_000);

const schema = z.object({
  shopName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email(),
  addressLine: z.string().trim().min(5).max(200),
  shopPostcode: z.string().trim().refine((v) => !!normalisePostcode(v), "Invalid postcode"),
  shopLat: z.number().min(49).max(61),
  shopLng: z.number().min(-9).max(2),
  deliveryPostcodes: z.string().trim().max(500),
  deliveryRadiusMiles: z.number().min(0).max(50),
  deliveryFee: pence,
  deliveryFeeLater: pence.nullable().optional(),
  deliveryFeeChangeAt: z.string().nullable().optional(),
  promoText: z.string().trim().max(200).optional().default(""),
  uberEatsUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).optional().default(""),
  justEatUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).optional().default(""),
  foodhubUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).optional().default(""),
  freeDeliveryOver: pence,
  minOrder: pence,
  serviceFee: pence,
  estimatedDeliveryMins: z.number().int().min(5).max(240),
  lastOrderMinsBeforeClose: z.number().int().min(0).max(120),
  orderingPaused: z.boolean(),
  pausedMessage: z.string().trim().max(300),
  openingHours: z
    .array(z.object({ day: z.number().int().min(0).max(6), open: time, close: time, closed: z.boolean() }))
    .length(7),
});

export const GET = handler(async () => {
  await apiStaff();
  return ok(await getSettings({ fresh: true }));
});

export const PUT = handler(async (req: Request) => {
  await apiAdmin();
  const body = await parseBody(req, schema);
  await getSettings(); // make sure the row exists
  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: {
      ...body,
      shopPostcode: normalisePostcode(body.shopPostcode)!,
      deliveryFeeLater: body.deliveryFeeLater ?? null,
      deliveryFeeChangeAt: body.deliveryFeeChangeAt ? new Date(body.deliveryFeeChangeAt) : null,
      deliveryPostcodes: body.deliveryPostcodes
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .join(","),
    },
  });
  return ok(settings);
});

/** Quick pause/resume toggle that staff can use during a rush. */
export const PATCH = handler(async (req: Request) => {
  await apiStaff();
  const { orderingPaused } = await parseBody(req, z.object({ orderingPaused: z.boolean() }));
  await getSettings();
  const settings = await prisma.settings.update({ where: { id: 1 }, data: { orderingPaused } });
  return ok(settings);
});
