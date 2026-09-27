import Link from "next/link";
import Image from "next/image";
import type { DayHours } from "@/lib/settings";
import { DAY_NAMES } from "@/lib/settings";
import { hoursLabel } from "@/lib/hours";
import { ClockIcon, PhoneIcon, PinIcon } from "./Icons";

export function Footer({ settings }: { settings: { phone: string; email: string; address: string; hours: DayHours[] } }) {
  // Show Monday first
  const ordered = [...settings.hours.slice(1), settings.hours[0]];
  const allSame = ordered.every((h) => hoursLabel(h) === hoursLabel(ordered[0]));

  return (
    <footer className="mt-20 border-t border-line bg-ember/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <Image src="/images/logo.png" alt="Flame Grill & Chill" width={160} height={155} className="mb-3 h-36 w-auto" />
          <p className="text-sm text-smoke">Ignite your cravings. Smash burgers, flame grilled chicken, pizza and more. 100% halal.</p>
        </div>
        <div>
          <h3 className="mb-3 font-display text-lg uppercase text-gold">Find us</h3>
          <p className="flex gap-2 text-sm text-smoke">
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-flame" /> {settings.address}
          </p>
          <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="mt-2 flex gap-2 text-sm text-smoke hover:text-cream">
            <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-flame" /> {settings.phone}
          </a>
        </div>
        <div>
          <h3 className="mb-3 font-display text-lg uppercase text-gold">Opening hours</h3>
          {allSame ? (
            <p className="flex gap-2 text-sm text-smoke">
              <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-flame" /> Mon – Sun · {hoursLabel(ordered[0])}
            </p>
          ) : (
            <ul className="space-y-1 text-sm text-smoke">
              {ordered.map((h) => (
                <li key={h.day} className="flex justify-between gap-4">
                  <span>{DAY_NAMES[h.day]}</span>
                  <span>{hoursLabel(h)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-3 font-display text-lg uppercase text-gold">Info</h3>
          <ul className="space-y-1.5 text-sm text-smoke">
            <li><Link className="hover:text-cream" href="/menu">Order online</Link></li>
            <li><Link className="hover:text-cream" href="/about">About us</Link></li>
            <li><Link className="hover:text-cream" href="/contact">Contact</Link></li>
            <li><Link className="hover:text-cream" href="/legal/allergens">Allergens</Link></li>
            <li><Link className="hover:text-cream" href="/legal/terms">Terms &amp; conditions</Link></li>
            <li><Link className="hover:text-cream" href="/legal/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-cream" href="/legal/cookies">Cookie policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/60 py-5 text-center text-xs text-smoke">
        © {new Date().getFullYear()} Flame Grill &amp; Chill · 100% Halal · Fresh ingredients · Payments secured by Stripe
      </div>
    </footer>
  );
}
