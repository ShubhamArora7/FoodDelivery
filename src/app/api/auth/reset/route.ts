import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { hashPassword, startSession } from "@/lib/auth";
import { passwordSchema } from "@/lib/validators";

export const POST = handler(async (req: Request) => {
  rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60 * 1000);
  const { token, password } = await parseBody(req, z.object({ token: z.string().min(10).max(200), password: passwordSchema }));

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, "This reset link is invalid or has expired. Please request a new one.");
  }

  const [, user] = await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 } },
    }),
  ]);
  await startSession(user);
  return ok({ ok: true });
});
