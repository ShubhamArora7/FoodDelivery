"use client";

import { useEffect, useState } from "react";

/** True after the first client render. Use it before reading localStorage-backed state to avoid hydration mismatches. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
