import { dateOnlyToIso } from "@/lib/dashboard/age";

/** "YYYY-MM-DD" → Date at noon UTC, safe to format in any time zone. */
export const fromDateOnly = (date: string) => new Date(dateOnlyToIso(date));
