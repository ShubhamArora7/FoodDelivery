import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, parseHours } from "@/lib/settings";
import { stripeEnabled } from "@/lib/stripe";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/admin");
  const s = await getSettings();
  return (
    <SettingsForm
      initial={{
        shopName: s.shopName,
        phone: s.phone,
        email: s.email,
        addressLine: s.addressLine,
        shopPostcode: s.shopPostcode,
        shopLat: s.shopLat,
        shopLng: s.shopLng,
        deliveryPostcodes: s.deliveryPostcodes,
        deliveryRadiusMiles: s.deliveryRadiusMiles,
        deliveryFee: s.deliveryFee,
        freeDeliveryOver: s.freeDeliveryOver,
        minOrder: s.minOrder,
        serviceFee: s.serviceFee,
        estimatedDeliveryMins: s.estimatedDeliveryMins,
        lastOrderMinsBeforeClose: s.lastOrderMinsBeforeClose,
        orderingPaused: s.orderingPaused,
        pausedMessage: s.pausedMessage,
        openingHours: parseHours(s.openingHours),
      }}
      status={{
        stripe: stripeEnabled(),
        webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
        email: !!process.env.SMTP_HOST,
        appUrl: process.env.APP_URL ?? "(not set)",
      }}
    />
  );
}
