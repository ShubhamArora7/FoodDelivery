import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ADMIN_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "CUSTOMER" | "STAFF" | "ADMIN";
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

const staffRole = (role: CurrentUser["role"]) => role === "STAFF" || role === "ADMIN";

/** Customers get the customer cookie; staff/admin get the separate admin cookie. */
export async function startSession(user: { id: string; role: CurrentUser["role"]; tokenVersion: number; name?: string }) {
  const token = await signSession({ sub: user.id, role: user.role, v: user.tokenVersion, n: user.name });
  const jar = await cookies();
  jar.set(staffRole(user.role) ? ADMIN_COOKIE : SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(scope: "customer" | "admin" = "customer") {
  const jar = await cookies();
  jar.delete(scope === "admin" ? ADMIN_COOKIE : SESSION_COOKIE);
}

async function userFromCookie(cookie: string, allowed: (role: CurrentUser["role"]) => boolean): Promise<CurrentUser | null> {
  const jar = await cookies();
  const session = await verifySession(jar.get(cookie)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, phone: true, role: true, tokenVersion: true },
  });
  if (!user || user.tokenVersion !== session.v || !allowed(user.role)) return null;
  const { tokenVersion: _v, ...rest } = user;
  return rest;
}

/** The logged-in customer on the public site, or null. Staff accounts never count here. */
// cache(): the layout and the page share one lookup per request
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  return userFromCookie(SESSION_COOKIE, (r) => r === "CUSTOMER");
});

/** The logged-in staff member in the admin panel, or null. */
export const getStaffUser = cache(async (): Promise<CurrentUser | null> => {
  return userFromCookie(ADMIN_COOKIE, staffRole);
});

/**
 * Name for the header greeting, read from the signed cookie only (no database trip).
 * Pages that show or change account data still use getCurrentUser().
 */
export async function getSessionGreeting(): Promise<{ name: string } | null> {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session || session.role !== "CUSTOMER") return null;
  if (session.n) return { name: session.n };
  const user = await getCurrentUser();
  return user ? { name: user.name } : null;
}

/** For server components / pages: redirect to login if not signed in. */
export async function requireUser(next = "/account"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export function isStaff(user: CurrentUser | null): boolean {
  return !!user && staffRole(user.role);
}

export async function requireStaffPage(): Promise<CurrentUser> {
  const user = await getStaffUser();
  if (!user) redirect("/admin/login");
  return user;
}
