"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getJSON, patchJSON, postJSON } from "@/lib/fetcher";
import { formatGBP } from "@/lib/money";
import { CloseIcon, MenuIcon } from "@/components/Icons";

type Alerts = { newCount: number; latest: { id: string; number: number; placedAt: string; total: number; customerName: string } | null };

const NAV = [
  { href: "/admin", label: "Dashboard", admin: false },
  { href: "/admin/orders", label: "Live orders", admin: false },
  { href: "/admin/day", label: "Daily orders", admin: false },
  { href: "/admin/menu", label: "Menu", admin: false },
  { href: "/admin/options", label: "Option groups", admin: true },
  { href: "/admin/discounts", label: "Discount codes", admin: true },
  { href: "/admin/customers", label: "Customers", admin: false },
  { href: "/admin/staff", label: "Staff", admin: true },
  { href: "/admin/settings", label: "Settings", admin: true },
];

/** Two-tone chime using WebAudio, so no sound file is needed. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320, 880, 1320].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + i * 0.25 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.25);
      o.stop(ctx.currentTime + i * 0.25 + 0.25);
    });
  } catch {}
}

export function AdminShell({
  user,
  paused,
  children,
}: {
  user: { name: string; role: string };
  paused: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [sound, setSound] = useState(false);
  const [isPaused, setIsPaused] = useState(paused);
  const lastSeen = useRef<string | null>(null);
  const soundRef = useRef(false);
  const isAdmin = user.role === "ADMIN";

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => setOpen(false), [pathname]);

  // Poll for new orders
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const res = await getJSON<Alerts>("/api/admin/orders/alerts");
      if (stop || !res.data) return;
      const latest = res.data.latest?.placedAt ?? null;
      if (lastSeen.current !== null && latest && latest > lastSeen.current) {
        if (soundRef.current) chime();
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && res.data.latest) {
          new Notification(`New order #${res.data.latest.number}`, { body: `${res.data.latest.customerName} · ${formatGBP(res.data.latest.total)}` });
        }
        router.refresh();
      }
      lastSeen.current = latest ?? lastSeen.current ?? "";
      setAlerts(res.data);
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [router]);

  // Keep ringing every 30s while there are unaccepted orders
  useEffect(() => {
    if (!sound || !alerts?.newCount) return;
    const t = setInterval(() => soundRef.current && chime(), 30000);
    return () => clearInterval(t);
  }, [sound, alerts?.newCount]);

  const nav = NAV.filter((n) => !n.admin || isAdmin);

  return (
    <div className="min-h-screen bg-coal md:flex">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 transform border-r border-line bg-ember transition md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-line p-4">
          <Image src="/images/logo-emblem.png" alt="" width={613} height={359} className="h-10 w-auto object-contain" />
          <div>
            <p className="font-display text-lg uppercase leading-none">Admin</p>
            <p className="text-xs text-smoke">{user.name} · {user.role.toLowerCase()}</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-flame text-white" : "text-cream/80 hover:bg-ash"
                }`}
              >
                {n.label}
                {n.href === "/admin/orders" && !!alerts?.newCount && (
                  <span className="animate-pulse rounded-full bg-chilli px-2 py-0.5 text-xs text-white">{alerts.newCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-line p-3 text-sm">
          <Link href="/" className="block rounded-lg px-3 py-2 text-smoke hover:bg-ash hover:text-cream" target="_blank">View website ↗</Link>
          <button
            className="block w-full rounded-lg px-3 py-2 text-left text-smoke hover:bg-ash hover:text-red-300"
            onClick={async () => {
              await postJSON("/api/admin/auth/logout");
              window.location.assign("/admin/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setOpen(false)} />}

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-coal/90 px-4 py-3 backdrop-blur">
          <button className="btn-ghost !px-2.5 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          {alerts?.newCount ? (
            <Link href="/admin/orders" className="animate-pulse rounded-lg bg-chilli px-3 py-1.5 text-sm font-bold">
              {alerts.newCount} new order{alerts.newCount > 1 ? "s" : ""} waiting
            </Link>
          ) : (
            <span className="text-sm text-smoke">No new orders</span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              className={`btn !px-3 !py-1.5 border ${isPaused ? "border-red-600 bg-red-900/40 text-red-200" : "border-emerald-700 bg-emerald-950/40 text-emerald-300"}`}
              onClick={async () => {
                const next = !isPaused;
                if (next && !window.confirm("Pause online ordering? Customers won't be able to check out.")) return;
                const res = await patchJSON("/api/admin/settings", { orderingPaused: next });
                if (!res.error) setIsPaused(next);
              }}
              title="Pause or resume online ordering"
            >
              {isPaused ? "Ordering PAUSED · resume" : "Taking orders · pause"}
            </button>
            <button
              className={`btn !px-3 !py-1.5 border ${sound ? "border-flame bg-flame/20" : "border-line bg-ember"}`}
              onClick={() => {
                const next = !sound;
                setSound(next);
                if (next) {
                  chime();
                  if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
                }
              }}
              title="Browsers need a click before they can play sound"
            >
              {sound ? "Sound alerts on" : "Enable sound alerts"}
            </button>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
