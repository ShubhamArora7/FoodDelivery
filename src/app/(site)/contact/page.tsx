import type { Metadata } from "next";
import { getSettings, parseHours, DAY_NAMES } from "@/lib/settings";
import { hoursLabel } from "@/lib/hours";
import { ClockIcon, PhoneIcon, PinIcon } from "@/components/Icons";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contact us" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const s = await getSettings();
  const hours = parseHours(s.openingHours);
  const ordered = [...hours.slice(1), hours[0]];
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(s.addressLine)}&output=embed`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-5xl font-bold uppercase">Contact <span className="flame-text">us</span></h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card space-y-5 p-6">
          <div className="flex gap-3">
            <PinIcon className="h-5 w-5 shrink-0 text-flame" />
            <div>
              <p className="font-semibold">Address</p>
              <p className="text-smoke">{s.addressLine}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <PhoneIcon className="h-5 w-5 shrink-0 text-flame" />
            <div>
              <p className="font-semibold">Phone</p>
              <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="text-smoke hover:text-cream">{s.phone}</a>
            </div>
          </div>
          <div className="flex gap-3">
            <ClockIcon className="h-5 w-5 shrink-0 text-flame" />
            <div className="flex-1">
              <p className="font-semibold">Opening hours</p>
              <ul className="mt-1 space-y-0.5 text-sm text-smoke">
                {ordered.map((h) => (
                  <li key={h.day} className="flex justify-between"><span>{DAY_NAMES[h.day]}</span><span>{hoursLabel(h)}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-display text-2xl uppercase">Send us a message</h2>
          <ContactForm />
        </div>
        <div className="card min-h-80 overflow-hidden">
          <iframe title="Map" src={mapSrc} className="h-full min-h-80 w-full border-0 grayscale-[30%]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </div>
  );
}
