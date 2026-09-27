import "server-only";
import crypto from "node:crypto";
import { prisma } from "./db";
import { ApiError } from "./api";
import { emailConfigured, sendLoginCodeEmail } from "./email";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hash = (id: string, code: string) => crypto.createHash("sha256").update(`${id}:${code}`).digest("hex");

/**
 * Until SMTP is set up, the code is shown on screen so sign in can still be tested.
 * Always on in development; in production only if ALLOW_DEMO_OTP=true.
 */
export function demoOtpAllowed() {
  if (emailConfigured()) return false;
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_OTP === "true";
}

/** Creates a 6-digit code, emails it, and returns the challenge id the browser keeps. */
export async function issueLoginCode(user: { id: string; email: string; name: string }) {
  const recent = await prisma.loginCode.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } } });
  if (recent >= 6) throw new ApiError(429, "Too many codes requested. Please wait a few minutes and try again.");
  if (!emailConfigured() && !demoOtpAllowed()) {
    throw new ApiError(503, "Email sign in isn't set up yet. Please try again later.");
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const record = await prisma.loginCode.create({
    data: { userId: user.id, codeHash: "pending", expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  await prisma.loginCode.update({ where: { id: record.id }, data: { codeHash: hash(record.id, code) } });
  // Only one live code at a time
  await prisma.loginCode.updateMany({ where: { userId: user.id, id: { not: record.id }, usedAt: null }, data: { usedAt: new Date() } });

  const sent = await sendLoginCodeEmail(user.email, user.name, code);
  return { challengeId: record.id, email: maskEmail(user.email), devCode: !sent && demoOtpAllowed() ? code : undefined };
}

/** Checks a code; returns the user id on success. */
export async function verifyLoginCode(challengeId: string, code: string): Promise<string> {
  const record = await prisma.loginCode.findUnique({ where: { id: challengeId } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, "This code has expired. Please request a new one.");
  }
  if (record.attempts >= MAX_ATTEMPTS) throw new ApiError(429, "Too many wrong attempts. Please request a new code.");
  const ok = crypto.timingSafeEqual(Buffer.from(record.codeHash), Buffer.from(hash(record.id, code.trim())));
  if (!ok) {
    await prisma.loginCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(400, "That code isn't right. Please check your email and try again.");
  }
  await prisma.loginCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record.userId;
}

function maskEmail(email: string) {
  const [u, d] = email.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, u.length - 2))}@${d}`;
}
