import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireStaffPage(), getSettings({ fresh: true })]);
  return (
    <AdminShell user={{ name: user.name, role: user.role }} paused={settings.orderingPaused}>
      {children}
    </AdminShell>
  );
}
