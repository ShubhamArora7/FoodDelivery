import { ApiError, apiUser, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { addressSchema, normalisePostcode } from "@/lib/validators";

export const GET = handler(async () => {
  const user = await apiUser();
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return ok(addresses);
});

export const POST = handler(async (req: Request) => {
  const user = await apiUser();
  const body = await parseBody(req, addressSchema);
  const count = await prisma.address.count({ where: { userId: user.id } });
  if (count >= 10) throw new ApiError(400, "You can save up to 10 addresses. Please delete one first.");

  const makeDefault = body.isDefault || count === 0;
  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return tx.address.create({
      data: {
        userId: user.id,
        label: body.label || "Home",
        line1: body.line1,
        line2: body.line2 || null,
        city: body.city,
        postcode: normalisePostcode(body.postcode)!,
        instructions: body.instructions || null,
        isDefault: makeDefault,
      },
    });
  });
  return ok(address, { status: 201 });
});
