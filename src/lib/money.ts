const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/** Format integer pence as "£9.49". */
export function formatGBP(pence: number): string {
  return gbp.format(pence / 100);
}

/** Parse a user-entered pounds value ("9.49", "£9.49") into pence. Returns null if invalid. */
export function poundsToPence(input: string | number): number | null {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[£,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function penceToPounds(pence: number): string {
  return (pence / 100).toFixed(2);
}
