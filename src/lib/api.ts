import "server-only";
import { NextResponse } from "next/server";
import { z, ZodTypeAny } from "zod";
import { getCurrentUser, getStaffUser, type CurrentUser } from "./auth";
import { clearCache } from "./cache";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, error: string, details?: unknown) {
  return NextResponse.json({ error, details }, { status });
}

/** Wrap a route handler so thrown ApiErrors become JSON responses. */
export function handler<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      const res = await fn(...args);
      // Any change made in the admin (menu, prices, settings, pause) shows on the site straight away
      const req = args[0];
      if (req instanceof Request && req.method !== "GET" && new URL(req.url).pathname.startsWith("/api/admin/") && res.ok) {
        clearCache();
      }
      return res;
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.message, e.details);
      console.error(e);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Invalid request body");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ApiError(400, first?.message || "Invalid input", result.error.flatten());
  }
  return result.data;
}

export async function apiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Please log in");
  return user;
}

export async function apiStaff(): Promise<CurrentUser> {
  const user = await getStaffUser();
  if (!user) throw new ApiError(401, "Please sign in to the admin panel");
  return user;
}

export async function apiAdmin(): Promise<CurrentUser> {
  const user = await apiStaff();
  if (user.role !== "ADMIN") throw new ApiError(403, "Admins only");
  return user;
}

// Simple in-memory rate limiter. Good enough for a single-server deployment;
// swap for Redis/Upstash if you run multiple instances.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) throw new ApiError(429, "Too many attempts. Please wait a few minutes and try again.");
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
