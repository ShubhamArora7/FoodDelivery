import { prisma } from "@/lib/db";
import { ApiError, clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { verifyPassword } from "@/lib/auth";
import { issueLoginCode } from "@/lib/otp";
import { loginSchema } from "@/lib/validators";

/** Step 1 of sign in: check the password, then email a 6-digit code (step 2 is /api/auth/verify-code). */
export const POST = handler(async (req: Request) => {
  const body = await parseBody(req, loginSchema);
  rateLimit(`login:${clientIp(req)}`, 20, 15 * 60 * 1000);
  rateLimit(`login:${body.email}`, 8, 15 * 60 * 1000);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  // Same message either way so we don't reveal which emails are registered
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new ApiError(401, "Incorrect email or password.");
  }
  if (user.role !== "CUSTOMER") {
    throw new ApiError(403, "This is a staff account, so it can't be used to order. Staff sign in on the admin login page.");
  }
  const challenge = await issueLoginCode(user);
  return ok({ otpRequired: true, ...challenge });
});
