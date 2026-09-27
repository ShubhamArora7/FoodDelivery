"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DayControls({ date, today, prev, next, live }: { date: string; today: string; prev: string; next: string; live: boolean }) {
  const router = useRouter();

  // Keep today's view up to date without a manual refresh
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(t);
  }, [live, router]);

  return (
    <div className="no-print card flex flex-wrap items-center gap-2 p-3">
      <Link href={`/admin/day?date=${prev}`} className="btn-ghost !px-3 !py-2">← Previous day</Link>
      <input
        type="date"
        className="input !w-auto !py-2"
        value={date}
        max={today}
        onChange={(e) => e.target.value && router.push(`/admin/day?date=${e.target.value}`)}
        aria-label="Choose a day"
      />
      {date < today && <Link href={`/admin/day?date=${next}`} className="btn-ghost !px-3 !py-2">Next day →</Link>}
      {date !== today && <Link href="/admin/day" className="btn-ghost !px-3 !py-2">Today</Link>}
      <div className="ml-auto flex gap-2">
        <a href={`/api/admin/orders/export?from=${date}&to=${date}`} className="btn-ghost !px-3 !py-2">Export CSV</a>
        <button className="btn-primary !px-3 !py-2" onClick={() => window.print()}>Print day sheet</button>
      </div>
      {live && <p className="w-full text-xs text-smoke">Updates automatically every 20 seconds.</p>}
    </div>
  );
}
