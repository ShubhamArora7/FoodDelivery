"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type HeroSlide = { image: string; name: string; label: string; price: string; badge: string };

/** Home page hero: food photos rise up to the front, then fall back as the next one comes in. */
export function HeroSlider({ slides, interval = 3500 }: { slides: HeroSlide[]; interval?: number }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((i) => (i + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [paused, slides.length, interval]);

  const current = slides[active];
  const prev = (active - 1 + slides.length) % slides.length;

  return (
    <div
      className="relative mx-auto w-full max-w-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 -z-10 rounded-full bg-flame/20 blur-3xl" />
      <div className="relative h-[420px] w-full [perspective:1200px] md:h-[500px]">
        {slides.map((s, i) => {
          const state = i === active ? "active" : i === prev ? "leaving" : "waiting";
          return (
            <div
              key={s.image}
              aria-hidden={i !== active}
              className={`absolute inset-0 overflow-hidden rounded-3xl transition-all duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${
                state === "active"
                  ? "z-20 translate-y-0 scale-100 opacity-100 glow [transform:rotateX(0deg)]"
                  : state === "leaving"
                    ? "z-10 -translate-y-6 scale-[.86] opacity-0 [transform:rotateX(18deg)]"
                    : "z-0 translate-y-16 scale-95 opacity-0"
              }`}
            >
              <Image
                src={s.image}
                alt={s.name}
                fill
                priority={i === 0}
                sizes="(max-width: 768px) 100vw, 450px"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-16">
                <p className="text-right font-display text-2xl font-bold uppercase text-cream drop-shadow">{s.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div key={`price-${active}`} className="hero-pop absolute -bottom-5 -left-4 z-30 rounded-2xl border border-line bg-coal/95 px-5 py-3 shadow-xl">
        <p className="text-xs uppercase tracking-wider text-smoke">{current.label}</p>
        <p className="font-display text-3xl font-bold text-gold">{current.price}</p>
      </div>
      <div key={`badge-${active}`} className="hero-pop absolute -right-3 top-6 z-30 rotate-6 rounded-xl bg-chilli px-3 py-2 font-display text-sm font-bold uppercase shadow-xl">
        {current.badge}
      </div>

      <div className="absolute -bottom-12 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        {slides.map((s, i) => (
          <button
            key={s.image}
            aria-label={`Show ${s.name}`}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all ${i === active ? "w-7 bg-flame" : "w-2 bg-smoke/50 hover:bg-smoke"}`}
          />
        ))}
      </div>
    </div>
  );
}
