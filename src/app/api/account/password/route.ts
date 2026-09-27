import { z } from "zod";
import { ApiError, apiUser, handler, ok, parseBody } from "@/lib/api";
import { hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { passwordSchema } from "@/lib/validators";

export const POST = handler(async (req: Request) => {
  const current = await apiUser();
  const body = await parseBody(req, z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }));
  const user = await prisma.user.findUniqueOrThrow({ where: { id: current.id } });
  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Your current password is incorrect.");
  }
  // Bump tokenVersion: signs out every other device, then re-issue this device's session
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.newPassword), tokenVersion: { increment: 1 } },
  });
  await startSession(updated);
  return ok({ ok: true });
});
