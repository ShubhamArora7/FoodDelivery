import type { Metadata } from "next";
import { Suspense } from "react";
import { getMenu } from "@/lib/menu";
import { getSettings, parseHours } from "@/lib/settings";
import { isOpen } from "@/lib/hours";
import { MenuClient } from "./MenuClient";

export const metadata: Metadata = { title: "Menu & Order Online" };
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  const open = !settings.orderingPaused && isOpen(parseHours(settings.openingHours), settings.lastOrderMinsBeforeClose);
  const notice = settings.orderingPaused
    ? settings.pausedMessage
    : open
      ? null
      : "We're closed right now. You can browse the menu and fill your basket, and order once we open.";

  return (
    <div>
      <section className="embers border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <h1 className="font-display text-5xl font-bold uppercase md:text-6xl">
            Our <span className="flame-text">menu</span>
          </h1>
          <p className="mt-2 text-smoke">Delivery across Worcester · 100% halal · Tap any item to customise it.</p>
          {notice && <p className="mt-4 rounded-lg border border-amber-600/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">{notice}</p>}
        </div>
      </section>
      <Suspense>
        <MenuClient menu={menu} />
      </Suspense>
    </div>
  );
}
