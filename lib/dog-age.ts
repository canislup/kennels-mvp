// A dog's age from its birth date, in the largest sensible unit. Years and
// months are counted on the calendar (a dog born 2024-10-08 is 2 on
// 2026-10-08), not by dividing days — that undercounts at the boundary.
export type DogAge = { unit: "weeks" | "months" | "years"; count: number };

export function dogAge(birthDate: Date, now = new Date()): DogAge {
    let months = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
    if (now.getDate() < birthDate.getDate()) months--;

    if (months >= 12) return { unit: "years", count: Math.floor(months / 12) };
    if (months >= 4) return { unit: "months", count: months };
    const weeks = Math.floor((now.getTime() - birthDate.getTime()) / (7 * 86_400_000));
    return { unit: "weeks", count: Math.max(1, weeks) };
}
