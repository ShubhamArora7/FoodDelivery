import { apiAdmin, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { groupSchema } from "@/lib/admin-schemas";

export const POST = handler(async (req: Request) => {
  await apiAdmin();
  const body = await parseBody(req, groupSchema);
  const group = await prisma.modifierGroup.create({
    data: {
      name: body.name,
      internalName: body.internalName || null,
      minSelect: body.minSelect,
      maxSelect: body.maxSelect,
      showWhenOptionId: body.showWhenOptionId || null,
      options: {
        create: body.options.map((o, i) => ({ name: o.name, price: o.price, available: o.available, sortOrder: i })),
      },
    },
  });
  return ok(group, { status: 201 });
});
