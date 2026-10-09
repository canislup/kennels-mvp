import type { createFormatter } from "next-intl";

type Formatter = ReturnType<typeof createFormatter>;
type TimeT = (key: "justNow" | "yesterday" | "daysAgo", values?: { count: number }) => string;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Whole calendar days from `from` to `to` (local time); negative if `to` is earlier. */
export function calendarDaysBetween(from: Date, to: Date): number {
    const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b - a) / (24 * HOUR));
}

/**
 * "Just now" · "12 min. ago" · "3 hr. ago" · "Yesterday" · "4 days ago" · "Oct 2".
 * Minutes/hours use next-intl's relativeTime; day-level wording comes from
 * dashboard.common.time messages, because next-intl always formats numerically
 * ("1 day ago") and the design asks for "Yesterday".
 */
export function formatRelativeTime(format: Formatter, t: TimeT, iso: string, now: Date): string {
    const date = new Date(iso);
    const elapsed = now.getTime() - date.getTime();
    const days = calendarDaysBetween(date, now);

    if (elapsed < MINUTE) return t("justNow");
    if (elapsed < HOUR) return format.relativeTime(date, { now, unit: "minute", style: "short" });
    if (days === 0) return format.relativeTime(date, { now, unit: "hour", style: "short" });
    if (days === 1) return t("yesterday");
    if (days < 7) return t("daysAgo", { count: days });
    return format.dateTime(date, { day: "numeric", month: "short" });
}
