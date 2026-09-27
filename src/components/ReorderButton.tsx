"use client";

import { useState } from "react";
import { getJSON } from "@/lib/fetcher";
import { useCart, type CartLine } from "@/store/cart";

export function ReorderButton({ orderId }: { orderId: string }) {
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-amber-300">{msg}</span>}
      <button
        className="btn-primary !py-2"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await getJSON<{ lines: Omit<CartLine, "key">[]; skipped: number }>(`/api/orders/${orderId}/reorder`);
          setBusy(false);
          if (res.error || !res.data) return setMsg(res.error || "Couldn't reorder");
          res.data.lines.forEach((l) => add(l));
          if (res.data.skipped) setMsg(`${res.data.skipped} item(s) are no longer available`);
          if (res.data.lines.length) setOpen(true);
        }}
      >
        {busy ? "Adding…" : "Reorder"}
      </button>
    </div>
  );
}
