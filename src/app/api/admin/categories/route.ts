import { ApiError, apiAdmin, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { categorySchema, slugify } from "@/lib/admin-schemas";

export const POST = handler(async (req: Request) => {
  await apiAdmin();
  const body = await parseBody(req, categorySchema);
  let slug = slugify(body.name);
  if (await prisma.category.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const category = await prisma.category.create({
    data: {
      name: body.name,
      slug,
      description: body.description || null,
      image: body.image || null,
      sortOrder: body.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      active: body.active ?? true,
    },
  });
  if (!category) throw new ApiError(500, "Could not create category");
  return ok(category, { status: 201 });
});
