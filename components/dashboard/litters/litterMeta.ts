// Shared by the Litters screen (server) and its client islands.
import type { LitterStatus, LitterStatusCounts } from "@/lib/dashboard/types";

export const LITTER_STATUS_ORDER: LitterStatus[] = ["PLANNED", "AVAILABLE", "RESERVED", "SOLD_OUT"];

/** URL param values (`?status=sold-out`) <-> domain values. */
export const LITTER_STATUS_PARAM: Record<LitterStatus, string> = {
    PLANNED: "planned",
    AVAILABLE: "available",
    RESERVED: "reserved",
    SOLD_OUT: "sold-out",
};

export const LITTER_COUNT_KEY: Record<LitterStatus, keyof LitterStatusCounts> = {
    PLANNED: "planned",
    AVAILABLE: "available",
    RESERVED: "reserved",
    SOLD_OUT: "soldOut",
};

/** Pill colors (text always accompanies the color). */
export const LITTER_PILL: Record<LitterStatus, string> = {
    PLANNED: "bg-stone-100 text-stone-700",
    AVAILABLE: "bg-status-green-bg text-status-green",
    RESERVED: "bg-status-amber-bg text-status-amber",
    SOLD_OUT: "bg-stone-200 text-stone-600",
};

/** Placed-share bar fill per status, as in the design. */
export const LITTER_BAR: Record<LitterStatus, string> = {
    PLANNED: "bg-stone-400",
    AVAILABLE: "bg-status-green-solid",
    RESERVED: "bg-status-amber-solid",
    SOLD_OUT: "bg-stone-500",
};

export const LITTER_DETAIL_ID = "litter-detail";
export const LITTER_LIST_ID = "litter-list";
