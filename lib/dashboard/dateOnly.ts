// REAL LOGIC (not a mock), safe in client and server code: date-only
// ("YYYY-MM-DD") helpers and the time-zone cookie. Date-only values are only
// ever compared with other date-only values, never with UTC instants.

/** Cookie the dashboard Greeting sets with the browser's IANA time zone. */
export const TIME_ZONE_COOKIE = "kennelos_tz";

/** Used until the browser has reported its zone (first visit). Launch market is Brazil. */
export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

/** A valid IANA zone from the raw cookie value, else the default. */
export function resolveTimeZone(raw: string | undefined): string {
    if (raw) {
        try {
            const zone = decodeURIComponent(raw);
            new Intl.DateTimeFormat("en-US", { timeZone: zone });
            return zone;
        } catch {
            // invalid zone: fall through
        }
    }
    return DEFAULT_TIME_ZONE;
}

/** "YYYY-MM-DD" for `date` as seen in `zone`. */
export function dateInZone(zone: string, date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const toUtcNoon = (date: string) => Date.parse(`${date}T12:00:00Z`);

/** Whole days from `from` to `to` (both "YYYY-MM-DD"); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
    return Math.round((toUtcNoon(to) - toUtcNoon(from)) / 86_400_000);
}

/** "YYYY-MM-DD" shifted by `days`. */
export function addDays(date: string, days: number): string {
    return new Date(toUtcNoon(date) + days * 86_400_000).toISOString().slice(0, 10);
}
