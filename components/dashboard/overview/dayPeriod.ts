// Shared by the server page and the client Greeting (kept out of the
// "use client" file so the server can call these functions).

export type DayPeriod = "morning" | "afternoon" | "evening";

import { DEFAULT_TIME_ZONE, TIME_ZONE_COOKIE } from "@/lib/dashboard/dateOnly";

export { TIME_ZONE_COOKIE };

export function periodForHour(hour: number): DayPeriod {
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

/** Best server-side guess of the viewer's day period: their saved time zone, else the default zone (same rule as getViewerToday). */
export function serverDayPeriod(
  cookieStore: { get(name: string): { value: string } | undefined },
  now = new Date(),
): DayPeriod {
  const raw = cookieStore.get(TIME_ZONE_COOKIE)?.value;

  for (const zone of [raw && decodeURIComponent(raw), DEFAULT_TIME_ZONE]) {
    if (!zone) continue;
    try {
      const hour = Number(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          hourCycle: "h23",
          timeZone: zone,
        }).format(now),
      );
      if (Number.isFinite(hour)) return periodForHour(hour);
    } catch {
      // Invalid zone in the cookie: try the default.
    }
  }
  return periodForHour(now.getHours());
}
