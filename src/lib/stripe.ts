import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) {
    // STRIPE_MOCK_URL is only used by the automated tests (points at Stripe's official stripe-mock server)
    const mock = process.env.STRIPE_MOCK_URL ? new URL(process.env.STRIPE_MOCK_URL) : null;
    client = new Stripe(
      process.env.STRIPE_SECRET_KEY,
      mock
        ? { host: mock.hostname, port: Number(mock.port || 80), protocol: mock.protocol.replace(":", "") as "http" | "https" }
        : undefined,
    );
  }
  return client;
}

/** Demo payments let you test the whole flow locally without Stripe keys. Never enable on the live site. */
export function demoPaymentsAllowed(): boolean {
  if (stripeEnabled()) return false;
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_PAYMENTS === "true";
}
