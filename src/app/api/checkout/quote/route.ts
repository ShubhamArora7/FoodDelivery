import { z } from "zod";
import { ApiError, apiUser, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { buildBill } from "@/lib/checkout";
import { cartSchema } from "@/lib/validators";

const schema = z.object({
  cart: cartSchema,
  addressId: z.string().nullable().optional(),
  discountCode: z.string().trim().max(40).nullable().optional(),
});

export const POST = handler(async (req: Request) => {
  const user = await apiUser();
  const body = await parseBody(req, schema);

  let postcode: string | null = null;
  if (body.addressId) {
    const address = await prisma.address.findFirst({ where: { id: body.addressId, userId: user.id } });
    if (!address) throw new ApiError(404, "Address not found");
    postcode = address.postcode;
  }

  const bill = await buildBill({ lines: body.cart, userId: user.id, postcode, discountCode: body.discountCode });
  return ok(bill);
});
