import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/** Demo payments let you test the whole flow locally without Stripe keys. Never enable on the live site. */
export function demoPaymentsAllowed(): boolean {
  if (stripeEnabled()) return false;
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_PAYMENTS === "true";
}
