import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { issueLoginCode } from "@/lib/otp";

export const POST = handler(async (req: Request) => {
  rateLimit(`otp-resend:${clientIp(req)}`, 10, 15 * 60 * 1000);
  const { challengeId } = await parseBody(req, z.object({ challengeId: z.string().min(1).max(100) }));
  const old = await prisma.loginCode.findUnique({ where: { id: challengeId }, include: { user: true } });
  if (!old || old.user.role !== "CUSTOMER") throw new ApiError(400, "Please sign in again.");
  return ok(await issueLoginCode(old.user));
});
