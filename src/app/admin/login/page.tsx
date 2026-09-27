import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getStaffUser } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getStaffUser()) redirect("/admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-coal px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-ember p-7 shadow-2xl">
        <Image src="/images/logo-emblem.png" alt="Flame Grill & Chill" width={120} height={60} className="mx-auto h-14 w-auto" />
        <h1 className="mt-4 text-center font-display text-2xl font-bold uppercase">Admin panel</h1>
        <p className="mt-1 text-center text-sm text-smoke">Staff sign in. Customers use the main website.</p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
