import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { CookieBanner } from "@/components/CookieBanner";
import { getSessionGreeting } from "@/lib/auth";
import { getSettings, parseHours } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getSessionGreeting(), getSettings()]);
  // Open/closed is controlled only by the Pause button in the admin panel
  const open = !settings.orderingPaused;

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user ? { name: user.name } : null} open={open} phone={settings.phone} />
      {!open && (
        <div role="status" className="border-b border-red-800/60 bg-red-950/70 px-4 py-2.5 text-center text-sm font-semibold text-red-200">
          {settings.pausedMessage || "We're closed right now."}
        </div>
      )}
      <main className="flex-1">{children}</main>
      <Footer settings={{ phone: settings.phone, email: settings.email, address: settings.addressLine, hours: parseHours(settings.openingHours), apps: { uberEatsUrl: settings.uberEatsUrl, justEatUrl: settings.justEatUrl, foodhubUrl: settings.foodhubUrl } }} />
      <CartDrawer />
      <CookieBanner />
    </div>
  );
}
