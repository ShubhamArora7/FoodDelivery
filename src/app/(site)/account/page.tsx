import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProfileForms } from "./ProfileForms";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const current = await requireUser("/account");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: current.id },
    select: { name: true, email: true, phone: true, marketingOptIn: true, role: true },
  });
  return <ProfileForms user={{ ...user, phone: user.phone ?? "" }} />;
}
