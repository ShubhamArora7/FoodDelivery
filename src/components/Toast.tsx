"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";
import { CheckIcon } from "./Icons";

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const setOpen = useCart((s) => s.setOpen);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-emerald-700 bg-emerald-950/95 px-4 py-3 text-sm shadow-2xl">
      <CheckIcon className="h-4 w-4 text-emerald-400" />
      <span>{message}</span>
      <button className="font-semibold text-flame-light hover:underline" onClick={() => { setOpen(true); onDone(); }}>
        View cart
      </button>
    </div>
  );
}
