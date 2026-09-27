import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DiscountManager } from "./DiscountManager";

export const metadata = { title: "Discount codes" };

export default async function DiscountsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/admin");
  const discounts = await prisma.discount.findMany({ orderBy: { createdAt: "desc" } });
  return <DiscountManager discounts={JSON.parse(JSON.stringify(discounts))} />;
}
