import { z } from "zod";
import { ApiError, apiAdmin, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { emailSchema, passwordSchema } from "@/lib/validators";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["STAFF", "ADMIN"]),
});

export const POST = handler(async (req: Request) => {
  await apiAdmin();
  const body = await parseBody(req, schema);
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    throw new ApiError(409, "That email already has an account. Change its role from the list instead.");
  }
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email, role: body.role, passwordHash: await hashPassword(body.password) },
    select: { id: true, name: true, email: true, role: true },
  });
  return ok(user, { status: 201 });
});
