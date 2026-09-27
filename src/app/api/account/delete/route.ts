import crypto from "node:crypto";
import { z } from "zod";
import { ApiError, apiUser, handler, ok, parseBody } from "@/lib/api";
import { endSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * UK GDPR "right to erasure". Order records must be kept for tax purposes, so we
 * anonymise the account and its orders instead of deleting them outright.
 */
export const POST = handler(async (req: Request) => {
  const current = await apiUser();
  if (current.role !== "CUSTOMER") throw new ApiError(400, "Staff accounts can't be deleted here.");
  const { password } = await parseBody(req, z.object({ password: z.string().min(1, "Enter your password") }));
  const user = await prisma.user.findUniqueOrThrow({ where: { id: current.id } });
  if (!(await verifyPassword(password, user.passwordHash))) throw new ApiError(400, "Incorrect password.");

  const active = await prisma.order.count({
    where: { userId: user.id, status: { in: ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY"] } },
  });
  if (active > 0) throw new ApiError(400, "You have an order in progress. Please try again once it's delivered.");

  const anon = `deleted-${crypto.randomBytes(6).toString("hex")}@deleted.invalid`;
  await prisma.$transaction([
    prisma.address.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.order.updateMany({
      where: { userId: user.id },
      data: {
        customerName: "Deleted customer",
        customerEmail: anon,
        customerPhone: "",
        addressLine1: "Removed",
        addressLine2: null,
        deliveryInstructions: null,
        notes: null,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        email: anon,
        name: "Deleted customer",
        phone: null,
        marketingOptIn: false,
        passwordHash: crypto.randomBytes(32).toString("hex"),
        tokenVersion: { increment: 1 },
      },
    }),
  ]);
  await endSession();
  return ok({ ok: true });
});
