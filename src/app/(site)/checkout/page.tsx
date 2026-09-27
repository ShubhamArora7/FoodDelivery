import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { stripeEnabled, demoPaymentsAllowed } from "@/lib/stripe";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const paymentMode = stripeEnabled() ? "stripe" : demoPaymentsAllowed() ? "demo" : "off";
  return (
    <CheckoutClient
      user={{ name: user.name, email: user.email, phone: user.phone ?? "" }}
      paymentMode={paymentMode}
      publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
    />
  );
}
