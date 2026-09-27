// Edge-safe session helpers (no database access), used by middleware and server code.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "fgc_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Role = "CUSTOMER" | "STAFF" | "ADMIN";

export type SessionPayload = {
  sub: string;
  role: Role;
  v: number;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-please-0123456789");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, v: payload.v })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      role: (payload.role as Role) ?? "CUSTOMER",
      v: typeof payload.v === "number" ? payload.v : 0,
    };
  } catch {
    return null;
  }
}
