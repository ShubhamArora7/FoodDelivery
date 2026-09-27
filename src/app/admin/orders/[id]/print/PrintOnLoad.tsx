"use client";

import { useEffect } from "react";

export function PrintOnLoad() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <button onClick={() => window.print()} className="no-print fixed right-4 top-4 rounded bg-black px-4 py-2 text-sm text-white">
      Print
    </button>
  );
}
