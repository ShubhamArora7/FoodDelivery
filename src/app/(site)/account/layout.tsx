import { requireUser } from "@/lib/auth";
import { AccountNav } from "./AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold uppercase">
        Hi, <span className="flame-text">{user.name.split(" ")[0]}</span>
      </h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
