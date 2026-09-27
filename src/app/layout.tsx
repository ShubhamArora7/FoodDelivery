import type { Metadata, Viewport } from "next";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "Flame Grill & Chill | Burgers, Pizza & Grilled Chicken in Worcester",
    template: "%s | Flame Grill & Chill",
  },
  description:
    "Order smash burgers, flame grilled chicken, pizza, wraps and shakes for delivery in Worcester. 100% halal. Open 7 days, 12:00 – 23:00.",
  icons: { icon: "/images/logo.png" },
  openGraph: {
    title: "Flame Grill & Chill",
    description: "Ignite your cravings. Order online for delivery in Worcester.",
    images: ["/images/burger-hero.jpg"],
    locale: "en_GB",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0806",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
