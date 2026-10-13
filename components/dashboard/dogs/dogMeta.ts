// Shared by the Dogs list (server) and its client islands.
import type { DogLifeStage, DogSex, DogStatus } from "@/lib/dashboard/types";

export const STATUS_ORDER: DogStatus[] = ["BREEDING_STOCK", "AVAILABLE_PUPPY", "RESERVED", "SOLD"];

/** Pill colors per status (text always accompanies the color). */
export const STATUS_PILL: Record<DogStatus, string> = {
    BREEDING_STOCK: "bg-stone-100 text-stone-700",
    AVAILABLE_PUPPY: "bg-status-green-bg text-status-green",
    RESERVED: "bg-status-amber-bg text-status-amber",
    SOLD: "bg-stone-200 text-stone-600",
};

// URL search-param values <-> domain values (keeps URLs short and readable).
export const STATUS_PARAM: Record<DogStatus, string> = {
    BREEDING_STOCK: "breeding-stock",
    AVAILABLE_PUPPY: "available",
    RESERVED: "reserved",
    SOLD: "sold",
};
export const SEX_PARAM: Record<DogSex, string> = { MALE: "male", FEMALE: "female" };
export const STAGE_PARAM: Record<DogLifeStage, string> = { PUPPY: "puppy", ADULT: "adult" };

export function fromParam<T extends string>(map: Record<T, string>, value: string | undefined): T | undefined {
    return (Object.keys(map) as T[]).find((key) => map[key] === value);
}

export { ageOf } from "@/lib/dashboard/age";
