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
        <Image src="/images/logo.png" alt="Flame Grill & Chill" width={640} height={620} unoptimized priority className="mx-auto h-32 w-auto object-contain" />
        <h1 className="mt-4 text-center font-display text-2xl font-bold uppercase">Admin panel</h1>
        <p className="mt-1 text-center text-sm text-smoke">Staff sign in. Customers use the main website.</p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
