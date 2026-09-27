"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cartCount, useCart } from "@/store/cart";
import { useHydrated } from "@/lib/use-hydrated";
import { CartIcon, CloseIcon, MenuIcon, PhoneIcon, UserIcon } from "./Icons";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header({
  user,
  open,
  phone,
}: {
  user: { name: string; staff: boolean } | null;
  open: boolean;
  phone: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(lines) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-coal/85 backdrop-blur-md">
      <div className="hidden border-b border-line/50 bg-ember/60 text-xs text-smoke md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${open ? "bg-emerald-400" : "bg-red-500"}`} />
            {open ? "Open now · Delivery only · 100% Halal" : "Closed right now · Open daily 12:00 – 23:00"}
          </span>
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-cream">
            <PhoneIcon className="h-3.5 w-3.5" /> {phone}
          </a>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <Image src="/images/logo-emblem.png" alt="Flame Grill & Chill" width={96} height={48} className="h-11 w-auto" priority />
          <span className="hidden font-display text-lg font-bold uppercase leading-none sm:block">
            <span className="flame-text">Flame</span> Grill &amp; Chill
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-md px-3 py-2 font-display text-sm uppercase tracking-wider transition ${
                  active ? "text-flame-light" : "text-cream/80 hover:text-white"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href={user.staff ? "/admin" : "/account"} className="btn-ghost hidden !px-3 sm:inline-flex" title="Your account">
              <UserIcon className="h-4 w-4" />
              <span className="max-w-24 truncate">{user.staff ? "Admin" : user.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link href="/login" className="btn-ghost hidden !px-3 sm:inline-flex">
              <UserIcon className="h-4 w-4" /> Sign in
            </Link>
          )}
          <button onClick={() => setOpen(true)} className="btn-primary relative !px-3" aria-label={`Open basket, ${count} items`}>
            <CartIcon />
            <span className="hidden sm:inline">Basket</span>
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-black">
                {count}
              </span>
            )}
          </button>
          <button className="btn-ghost !px-2.5 md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-line bg-coal px-4 pb-4 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className="block border-b border-line/50 py-3 font-display uppercase tracking-wider">
              {n.label}
            </Link>
          ))}
          <Link href={user ? (user.staff ? "/admin" : "/account") : "/login"} onClick={() => setMobileOpen(false)} className="block py-3 font-display uppercase tracking-wider text-flame-light">
            {user ? (user.staff ? "Admin panel" : "My account") : "Sign in / Register"}
          </Link>
        </nav>
      )}
    </header>
  );
}
