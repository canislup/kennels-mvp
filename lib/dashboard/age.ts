// REAL LOGIC (not a mock): shared age calculation for dashboard cards.
import type { DogAge } from "./types";

/**
 * Weeks for the first month, months under a year, then whole years,
 * counted on the calendar. `birthDate` is "YYYY-MM-DD".
 */
export function ageOf(birthDate: string | null, now: Date): DogAge | null {
    if (!birthDate) return null;
    const born = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(born.getTime()) || born > now) return null;
    let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
    if (now.getDate() < born.getDate()) months--;
    if (months >= 12) return { unit: "years", count: Math.floor(months / 12) };
    if (months >= 1) return { unit: "months", count: months };
    return { unit: "weeks", count: Math.max(1, Math.floor((now.getTime() - born.getTime()) / (7 * 86_400_000))) };
}

/** "YYYY-MM-DD" → ISO timestamp at noon UTC, so it shows the same calendar day in every time zone. */
export const dateOnlyToIso = (date: string) => `${date}T12:00:00.000Z`;
