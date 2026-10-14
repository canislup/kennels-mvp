// Shared by the Leads screens (server) and their client islands.
import type { BoardStage, LeadFollowUpFilter, LeadSource, LeadStage, LostReason } from "@/lib/dashboard/types";

/** The six pipeline stages (board, stepper, "Move to…", Change stage). LOST is never offered there. */
export const LEAD_STAGE_ORDER: BoardStage[] = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "RESERVED", "SOLD"];

export const LOST_REASON_ORDER: LostReason[] = ["NO_RESPONSE", "BOUGHT_ELSEWHERE", "CHANGED_MIND", "TOO_FAR", "OTHER"];

/** List view `?stage=` values, including Lost. */
export const STAGE_PARAM: Record<LeadStage, string> = {
    NEW: "new",
    CONTACTED: "contacted",
    INTERESTED: "interested",
    FOLLOW_UP: "follow-up",
    RESERVED: "reserved",
    SOLD: "sold",
    LOST: "lost",
};
export const LEAD_SOURCES: LeadSource[] = ["PUBLIC_FORM", "DIRECTORY", "REFERRAL", "OTHER"];

/** Column dot per stage (the stage name is always shown next to it). */
export const STAGE_DOT: Record<LeadStage, string> = {
    NEW: "bg-accent",
    CONTACTED: "bg-status-blue",
    INTERESTED: "bg-status-green-solid",
    FOLLOW_UP: "bg-status-amber-solid",
    RESERVED: "bg-status-pink",
    SOLD: "bg-stone-600",
    LOST: "bg-stone-400",
};

/** Stage pill (list view, lead page). */
export const STAGE_PILL: Record<LeadStage, string> = {
    NEW: "bg-accent-soft text-accent",
    CONTACTED: "bg-status-blue-bg text-status-blue",
    INTERESTED: "bg-status-green-bg text-status-green",
    FOLLOW_UP: "bg-status-amber-bg text-status-amber",
    RESERVED: "bg-status-pink-bg text-status-pink",
    SOLD: "bg-stone-200 text-stone-600",
    LOST: "bg-stone-100 text-stone-600",
};

/** URL values (`?source=public-form`) <-> domain values. */
export const SOURCE_PARAM: Record<LeadSource, string> = {
    PUBLIC_FORM: "public-form",
    DIRECTORY: "directory",
    REFERRAL: "referral",
    OTHER: "other",
};

export const FOLLOW_UP_PARAMS: Exclude<LeadFollowUpFilter, "any">[] = ["due", "set", "none"];

export type DueTone = "red" | "amber" | "neutral";

export const DUE_BADGE: Record<DueTone, string> = {
    red: "bg-status-red-bg text-status-red",
    amber: "bg-status-amber-bg text-status-amber",
    neutral: "bg-stone-100 text-stone-600",
};
