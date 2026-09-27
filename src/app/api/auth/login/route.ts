import { prisma } from "@/lib/db";
import { ApiError, clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { startSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export const POST = handler(async (req: Request) => {
  const body = await parseBody(req, loginSchema);
  rateLimit(`login:${clientIp(req)}`, 20, 15 * 60 * 1000);
  rateLimit(`login:${body.email}`, 8, 15 * 60 * 1000);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  // Same message either way so we don't reveal which emails are registered
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new ApiError(401, "Incorrect email or password.");
  }
  await startSession(user);
  return ok({ id: user.id, name: user.name, role: user.role });
});
