import type { DayHours } from "./settings";

const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Current day-of-week and minutes-since-midnight in UK time (handles BST automatically). */
export function londonNow(date = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { day: DAY_INDEX[get("weekday")] ?? 0, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Is the shop accepting orders right now? Supports closing times after midnight
 * (e.g. open 17:00, close 02:00). `cutoff` = stop taking orders N minutes before closing.
 */
export function isOpen(hours: DayHours[], cutoff = 0, date = new Date()): boolean {
  const { day, minutes } = londonNow(date);
  const today = hours.find((h) => h.day === day);
  const yesterday = hours.find((h) => h.day === (day + 6) % 7);

  if (today && !today.closed) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (close > open) {
      if (minutes >= open && minutes < close - cutoff) return true;
    } else {
      // closes after midnight: open from `open` until 24:00 today
      if (minutes >= open && minutes < 24 * 60 + close - cutoff) return true;
    }
  }
  // still within yesterday's after-midnight window?
  if (yesterday && !yesterday.closed) {
    const open = toMinutes(yesterday.open);
    const close = toMinutes(yesterday.close);
    if (close <= open && minutes < close - cutoff) return true;
  }
  return false;
}

export function hoursLabel(h: DayHours): string {
  return h.closed ? "Closed" : `${h.open} – ${h.close}`;
}

/** UTC instant of midnight UK time, `daysAgo` days before today. Handles BST. */
export function londonMidnight(daysAgo = 0, now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);
  // Start from UTC midnight of that calendar date, then correct by London's offset on that date
  const utcMidnight = new Date(Date.UTC(y, m - 1, d - daysAgo));
  const londonHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" }).format(utcMidnight),
  );
  // londonHour is 0 in GMT, 1 in BST
  return new Date(utcMidnight.getTime() - londonHour * 60 * 60 * 1000);
}
