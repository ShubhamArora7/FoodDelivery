import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { CookieBanner } from "@/components/CookieBanner";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getSettings, parseHours } from "@/lib/settings";
import { isOpen } from "@/lib/hours";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const open = !settings.orderingPaused && isOpen(parseHours(settings.openingHours), 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user ? { name: user.name, staff: isStaff(user) } : null} open={open} phone={settings.phone} />
      <main className="flex-1">{children}</main>
      <Footer settings={{ phone: settings.phone, email: settings.email, address: settings.addressLine, hours: parseHours(settings.openingHours) }} />
      <CartDrawer />
      <CookieBanner />
    </div>
  );
}
