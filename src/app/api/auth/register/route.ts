import { prisma } from "@/lib/db";
import { ApiError, clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { hashPassword, startSession } from "@/lib/auth";
import { normalisePostcode, registerSchema } from "@/lib/validators";

export const POST = handler(async (req: Request) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
  const body = await parseBody(req, registerSchema);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new ApiError(409, "An account with this email already exists. Try signing in instead.");

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      marketingOptIn: body.marketingOptIn,
      passwordHash: await hashPassword(body.password),
      ...(body.address
        ? {
            addresses: {
              create: {
                label: body.address.label || "Home",
                line1: body.address.line1,
                line2: body.address.line2 || null,
                city: body.address.city,
                postcode: normalisePostcode(body.address.postcode)!,
                instructions: body.address.instructions || null,
                isDefault: true,
              },
            },
          }
        : {}),
    },
  });
  await startSession(user);
  return ok({ id: user.id, name: user.name });
});
