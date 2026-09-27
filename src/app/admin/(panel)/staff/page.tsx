import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/auth";
import { StaffManager } from "./StaffManager";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const user = await getStaffUser();
  if (user?.role !== "ADMIN") redirect("/admin");
  const staff = await prisma.user.findMany({
    where: { role: { in: ["STAFF", "ADMIN"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });
  return <StaffManager staff={staff} meId={user.id} />;
}
