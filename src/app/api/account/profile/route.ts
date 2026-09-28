import { z } from "zod";
import { apiUser, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { phoneSchema } from "@/lib/validators";

export const GET = handler(async () => {
  const user = await apiUser();
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true, marketingOptIn: true, role: true, createdAt: true },
  });
  return ok(full);
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: phoneSchema,
  marketingOptIn: z.boolean(),
});

export const PATCH = handler(async (req: Request) => {
  const user = await apiUser();
  const body = await parseBody(req, schema);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: body.name, phone: body.phone, marketingOptIn: body.marketingOptIn },
    select: { id: true, name: true, phone: true, marketingOptIn: true, role: true, tokenVersion: true },
  });
  await startSession(updated); // refresh the name shown in the header
  return ok({ id: updated.id, name: updated.name, phone: updated.phone, marketingOptIn: updated.marketingOptIn });
});
