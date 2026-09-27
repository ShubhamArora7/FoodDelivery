import { z } from "zod";
import { ApiError, apiAdmin, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** Change someone's role. Setting CUSTOMER removes admin access. */
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const me = await apiAdmin();
  const { id } = await ctx.params;
  const { role } = await parseBody(req, z.object({ role: z.enum(["CUSTOMER", "STAFF", "ADMIN"]) }));
  if (id === me.id && role !== "ADMIN") throw new ApiError(400, "You can't remove your own admin access.");
  if (role !== "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", id: { not: id } } });
    if (admins === 0) throw new ApiError(400, "There must be at least one admin.");
  }
  const user = await prisma.user.update({
    where: { id },
    // bump tokenVersion so the change takes effect immediately
    data: { role, tokenVersion: { increment: 1 } },
    select: { id: true, name: true, email: true, role: true },
  });
  return ok(user);
});
