// REAL LOGIC (not a mock), server only: the calendar day the dashboard works
// in. It's the kennel's stored time zone (Settings → Kennel profile), so
// "today", follow-up due dates and "overdue" are the same for every device;
// without one, the time-zone cookie the dashboard Greeting saves, then the
// default zone (see dateOnly.ts).
import { cookies } from "next/headers";
import { getCurrentKennel } from "./kennel";
import { getKennelTimeZone } from "./kennelProfile";
import { dateInZone, resolveTimeZone, TIME_ZONE_COOKIE } from "./dateOnly";

export * from "./dateOnly";

/** The kennel's time zone, else the viewer's cookie, else the default (request scope only). */
export async function getViewerTimeZone(): Promise<string> {
    const kennel = await getCurrentKennel();
    const stored = kennel ? await getKennelTimeZone(kennel.id) : null;
    return resolveTimeZone(stored ?? (await cookies()).get(TIME_ZONE_COOKIE)?.value);
}

/** "Today" as "YYYY-MM-DD" in that zone (request scope only). */
export async function getViewerToday(): Promise<string> {
    return dateInZone(await getViewerTimeZone());
}
