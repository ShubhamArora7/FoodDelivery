"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { postJSON } from "@/lib/fetcher";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "My orders" },
  { href: "/account/addresses", label: "Addresses" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="card flex h-fit gap-1 overflow-x-auto p-2 md:flex-col">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            pathname === l.href ? "bg-flame text-white" : "text-cream/80 hover:bg-ash"
          }`}
        >
          {l.label}
        </Link>
      ))}
      <button
        className="shrink-0 rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-smoke hover:bg-ash hover:text-red-300"
        onClick={async () => {
          await postJSON("/api/auth/logout");
          window.location.assign("/");
        }}
      >
        Sign out
      </button>
    </nav>
  );
}
