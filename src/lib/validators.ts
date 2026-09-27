import { z } from "zod";

// UK postcode (loose but standard pattern), e.g. "WR1 1SB", "wr11sb"
export const UK_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;

export function normalisePostcode(input: string): string | null {
  const m = input.trim().toUpperCase().match(UK_POSTCODE);
  if (!m) return null;
  return `${m[1]} ${m[2]}`;
}

export function outwardCode(postcode: string): string {
  return postcode.trim().toUpperCase().split(/\s+/)[0] ?? "";
}

// UK phone: allow +44 or 0 prefix, 10-11 digits
export const UK_PHONE = /^(\+44\s?|0)\d[\d\s]{8,12}$/;

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200)
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

export const phoneSchema = z
  .string()
  .trim()
  .regex(UK_PHONE, "Enter a valid UK phone number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional().default("Home"),
  line1: z.string().trim().min(3, "Enter the first line of the address").max(120),
  line2: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2, "Enter the town or city").max(80),
  postcode: z
    .string()
    .trim()
    .refine((v) => normalisePostcode(v) !== null, "Enter a valid UK postcode"),
  instructions: z.string().trim().max(300).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: emailSchema,
  // Asked at first checkout if not given here
  phone: phoneSchema.optional().nullable().or(z.literal("")),
  password: passwordSchema,
  marketingOptIn: z.boolean().optional().default(false),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms" }) }),
});

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable().optional(),
  optionIds: z.array(z.string()).max(30).default([]),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().trim().max(200).optional().nullable(),
});

export const cartSchema = z.array(cartLineSchema).min(1, "Your cart is empty").max(60);
