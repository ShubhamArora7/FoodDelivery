import Link from "next/link";
import Image from "next/image";
import { HeroSlider } from "@/components/HeroSlider";
import { getMenu } from "@/lib/menu";
import { fromPrice } from "@/lib/menu-types";
import { getSettings } from "@/lib/settings";
import { formatGBP } from "@/lib/money";
import { ClockIcon, FlameIcon, LeafIcon, PinIcon } from "@/components/Icons";
import { DeliveryAppButtons } from "@/components/DeliveryApps";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  const all = menu.flatMap((c) => c.products.map((p) => ({ ...p, categorySlug: c.slug })));
  const popularNames = ["Double Flame Burger", "Chicken Wings", "Family Deal", "FGC Special King", "Loaded Fries", "Zinger Tower Burger"];
  const popular = popularNames
    .map((n) => all.find((p) => p.name === n))
    .filter((p): p is (typeof all)[number] => !!p);

  return (
    <>
      {settings.promoText && (
        <Link href="/menu" className="block bg-gradient-to-r from-flame to-chilli px-4 py-2.5 text-center text-sm font-semibold hover:brightness-110">
          {settings.promoText} · Order now →
        </Link>
      )}
      {/* HERO */}
      <section className="embers relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 pt-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-flame/40 bg-flame/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-flame-light">
              <FlameIcon className="h-3.5 w-3.5" /> Ignite your cravings
            </p>
            <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] md:text-7xl">
              Smashed. Grilled.
              <br />
              <span className="flame-text">Delivered hot.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-smoke">
              Smash burgers from {formatGBP(399)}, flame grilled chicken, pizzas, wraps and loaded fries, delivered
              across Worcester. 100% halal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/menu" className="btn-primary !px-8 !py-3.5 text-base">Order now</Link>
              <Link href="/menu#meal-deals" className="btn-ghost !px-6 !py-3.5 text-base">See meal deals</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-smoke">
              <span className="flex items-center gap-2"><ClockIcon className="h-4 w-4 text-flame" /> Mon – Sun · 12:00 – 23:00</span>
              <span className="flex items-center gap-2"><PinIcon className="h-4 w-4 text-flame" /> {settings.addressLine}</span>
            </div>
          </div>
          <HeroSlider
            slides={[
              { image: "/images/menu/double-flame-burger.jpg", name: "Double Flame Burger", label: "Any burger", price: formatGBP(399), badge: "Best seller" },
              { image: "/images/menu/fgc-special-king.jpg", name: "FGC Special King", label: "Pizzas from", price: formatGBP(549), badge: "Stone baked" },
              { image: "/images/menu/grilled-chicken-wrap.jpg", name: "Grilled Chicken Wrap", label: "Wraps from", price: formatGBP(549), badge: "Freshly wrapped" },
              { image: "/images/menu/1-2-grilled-chicken-meal.jpg", name: "1/2 Grilled Chicken Meal", label: "Meal with drink", price: formatGBP(949), badge: "Flame grilled" },
            ]}
          />
        </div>
      </section>

      {/* USP STRIP */}
      <section className="border-y border-line bg-ember/70">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-5 text-center text-sm font-semibold uppercase tracking-wider md:grid-cols-4">
          <span className="flex items-center justify-center gap-2"><span className="text-gold">حلال</span> 100% Halal</span>
          <span className="flex items-center justify-center gap-2"><LeafIcon className="h-4 w-4 text-emerald-400" /> Fresh ingredients</span>
          <span className="flex items-center justify-center gap-2"><FlameIcon className="h-4 w-4 text-flame" /> Bold flavours</span>
          <span className="flex items-center justify-center gap-2"><FlameIcon className="h-4 w-4 text-chilli" /> Grilled to perfection</span>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="section-title">What are you <span className="flame-text">craving?</span></h2>
          <Link href="/menu" className="hidden text-sm font-semibold text-flame-light hover:underline sm:block">Full menu →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {menu.slice(0, 8).map((c) => (
            <Link key={c.id} href={`/menu#${c.slug}`} className="group card relative aspect-[4/3] overflow-hidden">
              {c.image && (
                <Image src={c.image} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-90" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute bottom-0 p-4">
                <h3 className="font-display text-xl font-bold uppercase md:text-2xl">{c.name}</h3>
                <p className="text-xs text-smoke">{c.products.length} items</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* POPULAR */}
      {popular.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <h2 className="section-title mb-8">Crowd <span className="flame-text">favourites</span></h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((p) => (
              <Link key={p.id} href={`/menu?item=${p.id}#${p.categorySlug}`} className="card group flex overflow-hidden transition hover:border-flame/60">
                {p.image && (
                  <div className="relative w-32 shrink-0 sm:w-36">
                    <Image src={p.image} alt="" fill sizes="150px" className="object-cover" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-bold uppercase leading-tight">{p.name}</h3>
                    {p.badge && <span className="shrink-0 rounded bg-chilli px-1.5 py-0.5 text-[10px] font-bold uppercase">{p.badge}</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-smoke">{p.description}</p>
                  <p className="mt-auto pt-3 font-semibold text-gold">
                    {p.variants.length ? "From " : ""}
                    {formatGBP(fromPrice(p))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* DEALS BANNER */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="card embers relative grid overflow-hidden md:grid-cols-2">
          <div className="p-8 md:p-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-gold">Feeding the crew?</p>
            <h2 className="mt-2 font-display text-4xl font-bold uppercase md:text-5xl">
              Family Deal <span className="flame-text">{formatGBP(1999)}</span>
            </h2>
            <p className="mt-3 max-w-md text-smoke">1/2 grilled chicken, 4 wings, 2 fries, coleslaw &amp; 2 drinks. Or grab a Wings Deal for {formatGBP(999)}.</p>
            <Link href="/menu#meal-deals" className="btn-primary mt-6 !px-8 !py-3">View all deals</Link>
          </div>
          <div className="relative min-h-60">
            <Image src="/images/menu/family-deal.jpg" alt="Family Deal" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* DELIVERY APPS */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="card flex flex-col items-start gap-5 p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase">Prefer an app? <span className="flame-text">We&apos;re there too</span></h2>
            <p className="mt-1 text-smoke">You can also order from Flame Grill &amp; Chill on Uber Eats, Just Eat and Foodhub.</p>
          </div>
          <DeliveryAppButtons links={{ uberEatsUrl: settings.uberEatsUrl, justEatUrl: settings.justEatUrl, foodhubUrl: settings.foodhubUrl }} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <h2 className="section-title mb-8 text-center">How it <span className="flame-text">works</span></h2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["1", "Pick your food", "Choose sizes, flavours and extras exactly how you like them."],
            ["2", "Pay securely", "Checkout with card, Apple Pay or Google Pay. Payments are handled by Stripe."],
            ["3", "Track your order", `We'll deliver hot to your door in around ${settings.estimatedDeliveryMins} minutes.`],
          ].map(([n, t, d]) => (
            <div key={n} className="card p-6">
              <span className="font-display text-5xl font-bold text-flame/80">{n}</span>
              <h3 className="mt-2 font-display text-xl uppercase">{t}</h3>
              <p className="mt-1 text-sm text-smoke">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
