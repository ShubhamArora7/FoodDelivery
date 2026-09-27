import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { emailSchema } from "@/lib/validators";
import { sendPasswordResetEmail } from "@/lib/email";

export const POST = handler(async (req: Request) => {
  rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60 * 1000);
  const { email } = await parseBody(req, z.object({ email: emailSchema }));

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const appUrl = process.env.APP_URL || new URL(req.url).origin;
    await sendPasswordResetEmail(user.email, user.name, `${appUrl}/reset-password?token=${token}`);
  }
  // Always the same response so we don't reveal whether the email is registered
  return ok({ sent: true });
});
