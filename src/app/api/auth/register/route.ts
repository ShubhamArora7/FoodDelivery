import { prisma } from "@/lib/db";
import { ApiError, clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { issueLoginCode } from "@/lib/otp";
import { registerSchema } from "@/lib/validators";

/** Creates the account, then emails a 6-digit code. The session starts after the code is entered. */
export const POST = handler(async (req: Request) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
  const body = await parseBody(req, registerSchema);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new ApiError(409, "An account with this email already exists. Try signing in instead.");

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      marketingOptIn: body.marketingOptIn,
      passwordHash: await hashPassword(body.password),
    },
  });
  const challenge = await issueLoginCode(user);
  return ok({ otpRequired: true, ...challenge });
});
