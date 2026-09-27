import "server-only";
import type { Settings } from "@prisma/client";
import { normalisePostcode, outwardCode } from "./validators";
import { currentDeliveryFee } from "./settings";

export type DeliveryCheck =
  | { ok: true; postcode: string; fee: number; distanceMiles: number | null }
  | { ok: false; reason: string };

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Looks up a UK postcode with the free postcodes.io service (no API key).
 * Returns null if the service can't be reached, so ordering never breaks because of it.
 */
async function lookupPostcode(postcode: string): Promise<{ valid: boolean; lat?: number; lng?: number } | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (res.status === 404) return { valid: false };
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { latitude: number | null; longitude: number | null } };
    if (!data.result || data.result.latitude == null || data.result.longitude == null) return { valid: true };
    return { valid: true, lat: data.result.latitude, lng: data.result.longitude };
  } catch {
    return null;
  }
}

export async function checkDelivery(settings: Settings, rawPostcode: string, subtotal: number): Promise<DeliveryCheck> {
  const postcode = normalisePostcode(rawPostcode);
  if (!postcode) return { ok: false, reason: "That doesn't look like a valid UK postcode." };

  const allowed = settings.deliveryPostcodes
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(outwardCode(postcode))) {
    return { ok: false, reason: `Sorry, we don't deliver to ${postcode} yet. We deliver to ${allowed.join(", ")}.` };
  }

  let distanceMiles: number | null = null;
  const lookup = await lookupPostcode(postcode);
  if (lookup && !lookup.valid) return { ok: false, reason: "We couldn't find that postcode. Please check it." };
  if (lookup?.lat != null && lookup.lng != null) {
    distanceMiles = Math.round(haversineMiles(settings.shopLat, settings.shopLng, lookup.lat, lookup.lng) * 10) / 10;
    if (settings.deliveryRadiusMiles > 0 && distanceMiles > settings.deliveryRadiusMiles) {
      return {
        ok: false,
        reason: `Sorry, ${postcode} is ${distanceMiles} miles away. We deliver up to ${settings.deliveryRadiusMiles} miles.`,
      };
    }
  }

  const free = settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver;
  return { ok: true, postcode, fee: free ? 0 : currentDeliveryFee(settings), distanceMiles };
}
