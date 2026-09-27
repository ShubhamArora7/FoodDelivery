"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";

/** Refreshes the order page while it's in progress, and empties the basket after a successful order. */
export function OrderLive({ active, clearCart, interval = 15000 }: { active: boolean; clearCart: boolean; interval?: number }) {
  const router = useRouter();
  const clear = useCart((s) => s.clear);

  useEffect(() => {
    if (clearCart) clear();
  }, [clearCart, clear]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), interval);
    return () => clearInterval(t);
  }, [active, router, interval]);

  return null;
}
