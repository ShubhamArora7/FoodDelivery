import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FlameIcon, LeafIcon } from "@/components/Icons";

export const metadata: Metadata = { title: "About us" };

// NOTE for the client: this copy is a starting point. Replace it with your own story.
export default function AboutPage() {
  return (
    <div>
      <section className="embers border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h1 className="font-display text-5xl font-bold uppercase md:text-6xl">
            About <span className="flame-text">us</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-smoke">Worcester&apos;s home of smash burgers, flame grilled chicken and late-night favourites.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-2">
        <div className="space-y-4 text-smoke">
          <h2 className="section-title text-cream">Ignite your <span className="flame-text">cravings</span></h2>
          <p>
            Flame Grill &amp; Chill started with a simple idea: proper fast food, cooked fresh to order with bold flavours and
            honest prices. Every burger is smashed on the grill, every half chicken is flame grilled, and every pizza is topped
            generously.
          </p>
          <p>
            You&apos;ll find us at 67 Barbourne Road, Worcester, open seven days a week from midday until late. Everything we
            serve is 100% halal, and we make our signature and flame sauces in-house.
          </p>
          <p>Whether it&apos;s a quick lunch, a family feast or a late-night box, we&apos;ve got you covered.</p>
          <Link href="/menu" className="btn-primary mt-2">Order now</Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Image src="/images/burger-hero.jpg" alt="Double Flame Burger" width={400} height={450} className="card h-full w-full object-cover" />
          <div className="grid gap-4">
            <Image src="/images/half-chicken.jpg" alt="Grilled chicken" width={400} height={220} className="card h-full w-full object-cover" />
            <Image src="/images/pizza.jpg" alt="Pizza" width={400} height={220} className="card h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 md:grid-cols-3">
        {[
          { icon: <span className="font-display text-2xl text-gold">حلال</span>, t: "100% Halal", d: "All of our meat is halal certified." },
          { icon: <LeafIcon className="h-7 w-7 text-emerald-400" />, t: "Fresh ingredients", d: "Fresh salad, fresh dough and quality meat, prepared daily." },
          { icon: <FlameIcon className="h-7 w-7 text-flame" />, t: "Grilled to perfection", d: "Flame grilled chicken and smash burgers cooked to order." },
        ].map((x) => (
          <div key={x.t} className="card p-6">
            {x.icon}
            <h3 className="mt-3 font-display text-xl uppercase">{x.t}</h3>
            <p className="mt-1 text-sm text-smoke">{x.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
