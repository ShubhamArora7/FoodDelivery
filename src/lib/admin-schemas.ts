import { z } from "zod";

const pence = z.number().int().min(0).max(100_000);

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).nullable().optional(),
  image: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export const productSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  name: z.string().trim().min(2, "Name is too short").max(80),
  description: z.string().trim().max(500).nullable().optional(),
  image: z.string().trim().max(500).nullable().optional(),
  basePrice: pence,
  badge: z.string().trim().max(30).nullable().optional(),
  isVegetarian: z.boolean(),
  isSpicy: z.boolean(),
  allergens: z.string().trim().max(300).nullable().optional(),
  available: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  variants: z
    .array(z.object({ id: z.string().optional(), name: z.string().trim().min(1, "Size name required").max(40), price: pence }))
    .max(10),
  groupIds: z.array(z.string()).max(20),
});

export const groupSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    internalName: z.string().trim().max(80).nullable().optional(),
    minSelect: z.number().int().min(0).max(20),
    maxSelect: z.number().int().min(1).max(20),
    showWhenOptionId: z.string().nullable().optional(),
    options: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().trim().min(1, "Option name required").max(60),
          price: pence,
          available: z.boolean(),
        }),
      )
      .min(1, "Add at least one option")
      .max(40),
  })
  .refine((g) => g.maxSelect >= g.minSelect, { message: "Max must be at least min", path: ["maxSelect"] });

export const discountSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "Code must be 3–30 letters/numbers"),
  description: z.string().trim().max(200).nullable().optional(),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().min(1).max(100_000),
  minSubtotal: pence,
  maxUses: z.number().int().min(1).nullable().optional(),
  onePerCustomer: z.boolean(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  active: z.boolean(),
});

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "category";
