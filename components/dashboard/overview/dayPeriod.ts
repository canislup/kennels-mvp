// Shared by the server page and the client Greeting (kept out of the
// "use client" file so the server can call these functions).

export type DayPeriod = "morning" | "afternoon" | "evening";

/** Cookie the Greeting sets with the browser's IANA time zone. */
export const TIME_ZONE_COOKIE = "kennelos_tz";

export function periodForHour(hour: number): DayPeriod {
    return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

/** Best server-side guess of the viewer's day period: their saved time zone, else server time. */
export function serverDayPeriod(cookieStore: { get(name: string): { value: string } | undefined }, now = new Date()): DayPeriod {
    const zone = cookieStore.get(TIME_ZONE_COOKIE)?.value;
    if (zone) {
        try {
            const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: decodeURIComponent(zone) }).format(now));
            if (Number.isFinite(hour)) return periodForHour(hour);
        } catch {
            // Invalid zone in the cookie: fall through to server time.
        }
    }
    return periodForHour(now.getHours());
}
