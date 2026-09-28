import "server-only";
import type { Settings } from "@prisma/client";
import { prisma } from "./db";
import { cached } from "./cache";

export type DayHours = { day: number; open: string; close: string; closed: boolean };

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function defaultHours(): DayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "12:00", close: "23:00", closed: false }));
}

export function parseHours(value: unknown): DayHours[] {
  if (!Array.isArray(value)) return defaultHours();
  const byDay = new Map<number, DayHours>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const day = Number(r.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    byDay.set(day, {
      day,
      open: typeof r.open === "string" ? r.open : "12:00",
      close: typeof r.close === "string" ? r.close : "23:00",
      closed: Boolean(r.closed),
    });
  }
  return [0, 1, 2, 3, 4, 5, 6].map((d) => byDay.get(d) ?? { day: d, open: "12:00", close: "23:00", closed: false });
}

async function loadSettings(): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.settings.create({ data: { id: 1, openingHours: defaultHours() } });
}

/**
 * Shop settings, cached for a few seconds. Pass { fresh: true } where it must be exact
 * (placing an order, the admin settings page).
 */
export async function getSettings(opts?: { fresh?: boolean }): Promise<Settings> {
  if (opts?.fresh) return loadSettings();
  return cached("settings", 10_000, loadSettings);
}

/** Delivery fee in force right now (handles a scheduled change such as a launch offer ending). */
export function currentDeliveryFee(s: Pick<Settings, "deliveryFee" | "deliveryFeeLater" | "deliveryFeeChangeAt">, now = new Date()): number {
  if (s.deliveryFeeLater != null && s.deliveryFeeChangeAt && now >= s.deliveryFeeChangeAt) return s.deliveryFeeLater;
  return s.deliveryFee;
}
