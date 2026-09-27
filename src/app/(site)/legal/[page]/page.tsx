import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";

// NOTE for the client: these are templates, not legal advice. Have them checked
// and fill in your registered business name and address before going live.

type Section = { h: string; p: string[] };
type Doc = { title: string; sections: Section[] };

function docs(shop: { phone: string; email: string; address: string }): Record<string, Doc> {
  return {
    allergens: {
      title: "Allergen information",
      sections: [
        {
          h: "Before you order",
          p: [
            "Our food is prepared in a kitchen that handles all 14 major allergens: celery, cereals containing gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, tree nuts, peanuts, sesame, soya and sulphites.",
            "Where we list allergens against a menu item you'll see them when you tap the item. Because of shared equipment and fryers, we cannot guarantee that any item is free from allergens.",
            `If you have a food allergy or intolerance, please call us on ${shop.phone} before ordering and let us know in the order notes. Our team will tell you what's in each dish.`,
          ],
        },
        { h: "Halal", p: ["All of the meat we serve is 100% halal."] },
      ],
    },
    terms: {
      title: "Terms & conditions",
      sections: [
        { h: "About us", p: [`Flame Grill & Chill, ${shop.address}. Contact: ${shop.phone}, ${shop.email}.`] },
        {
          h: "Orders",
          p: [
            "When you place an order you'll receive an email confirming we've received it. A contract is formed when we accept your order. We may refuse or cancel an order, for example if an item is unavailable or your address is outside our delivery area; if so, we'll refund you in full.",
            "Prices include VAT where applicable. Delivery fees and any service fee are shown before you pay.",
          ],
        },
        {
          h: "Delivery",
          p: [
            "Delivery times are estimates. Please make sure someone is available to receive the order at the address given and that your phone number is correct.",
          ],
        },
        {
          h: "Cancellations and refunds",
          p: [
            "Because our food is made to order, you can't cancel once we've started preparing it. If something is wrong with your order, call us straight away and we'll put it right or give a refund where appropriate. This does not affect your statutory rights.",
          ],
        },
        { h: "Payments", p: ["Card payments are processed securely by Stripe. We never see or store your full card details."] },
      ],
    },
    privacy: {
      title: "Privacy policy",
      sections: [
        {
          h: "What we collect",
          p: [
            "When you create an account or order we collect your name, email address, phone number, delivery address(es) and order history. Payment details are handled by Stripe and are not stored by us.",
          ],
        },
        {
          h: "Why we use it",
          p: [
            "To take and deliver your orders, contact you about them, keep your account working, prevent fraud and meet our legal obligations. We only send marketing emails if you opt in, and you can opt out at any time.",
          ],
        },
        {
          h: "Who we share it with",
          p: [
            "Our payment processor (Stripe), our hosting and email providers, and delivery staff (name, phone and address only). We never sell your data.",
          ],
        },
        {
          h: "How long we keep it",
          p: ["We keep order records for up to 6 years for tax purposes. You can delete your account at any time from your account page."],
        },
        {
          h: "Your rights",
          p: [
            `Under UK GDPR you can ask for a copy of your data, ask us to correct or delete it, or object to how we use it. Contact us at ${shop.email}. You can also complain to the Information Commissioner's Office (ico.org.uk).`,
          ],
        },
      ],
    },
    cookies: {
      title: "Cookie policy",
      sections: [
        {
          h: "Cookies we use",
          p: [
            "fgc_session – keeps you signed in (strictly necessary, 30 days).",
            "Basket storage – your browser's local storage remembers your basket (strictly necessary).",
            "Stripe – at checkout, Stripe sets cookies to prevent fraud (strictly necessary).",
          ],
        },
        {
          h: "No tracking",
          p: ["We don't use advertising or analytics cookies. If that changes, we'll ask for your consent first."],
        },
      ],
    },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  const titles: Record<string, string> = {
    allergens: "Allergen information",
    terms: "Terms & conditions",
    privacy: "Privacy policy",
    cookies: "Cookie policy",
  };
  return { title: titles[page] ?? "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const s = await getSettings();
  const doc = docs({ phone: s.phone, email: s.email, address: s.addressLine })[page];
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold uppercase">{doc.title}</h1>
      <div className="mt-8 space-y-8">
        {doc.sections.map((sec) => (
          <section key={sec.h}>
            <h2 className="font-display text-xl uppercase text-gold">{sec.h}</h2>
            {sec.p.map((para, i) => (
              <p key={i} className="mt-2 leading-relaxed text-smoke">{para}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
