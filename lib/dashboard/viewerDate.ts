// REAL LOGIC (not a mock), server only: the viewer's calendar day, from the
// time-zone cookie the dashboard Greeting saves (see dateOnly.ts).
import { cookies } from "next/headers";
import { dateInZone, resolveTimeZone, TIME_ZONE_COOKIE } from "./dateOnly";

export * from "./dateOnly";

/** The viewer's time zone (request scope only). */
export async function getViewerTimeZone(): Promise<string> {
    return resolveTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value);
}

/** The viewer's "today" as "YYYY-MM-DD" (request scope only). */
export async function getViewerToday(): Promise<string> {
    return dateInZone(await getViewerTimeZone());
}

