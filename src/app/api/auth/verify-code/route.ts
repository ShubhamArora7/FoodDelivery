import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { verifyLoginCode } from "@/lib/otp";

/** Step 2 of sign in / sign up: check the emailed code and start the session. */
export const POST = handler(async (req: Request) => {
  rateLimit(`otp:${clientIp(req)}`, 30, 15 * 60 * 1000);
  const body = await parseBody(req, z.object({ challengeId: z.string().min(1).max(100), code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") }));
  const userId = await verifyLoginCode(body.challengeId, body.code);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "CUSTOMER") throw new ApiError(400, "This code can't be used here.");
  await startSession(user);
  return ok({ id: user.id, name: user.name });
});
