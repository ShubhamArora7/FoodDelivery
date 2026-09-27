"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartLine = {
  key: string;
  productId: string;
  variantId: string | null;
  optionIds: string[];
  quantity: number;
  notes: string | null;
  // display snapshot (server re-prices at checkout)
  name: string;
  image: string | null;
  variantName: string | null;
  optionNames: string[];
  unitPrice: number;
};

type CartState = {
  lines: CartLine[];
  discountCode: string;
  open: boolean;
  add: (line: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setDiscountCode: (code: string) => void;
  setOpen: (open: boolean) => void;
};

function lineKey(l: Pick<CartLine, "productId" | "variantId" | "optionIds" | "notes">) {
  return [l.productId, l.variantId ?? "", [...l.optionIds].sort().join("."), l.notes ?? ""].join("|");
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      discountCode: "",
      open: false,
      add: (line) =>
        set((s) => {
          const key = lineKey(line);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l)),
            };
          }
          return { lines: [...s.lines, { ...line, key }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({
          lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, qty) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [], discountCode: "" }),
      setDiscountCode: (discountCode) => set({ discountCode }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: "fgc-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, discountCode: s.discountCode }),
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

/** Payload the API expects. */
export const toApiCart = (lines: CartLine[]) =>
  lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    optionIds: l.optionIds,
    quantity: l.quantity,
    notes: l.notes,
  }));
