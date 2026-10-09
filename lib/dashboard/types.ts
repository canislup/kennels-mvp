// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (This file holds only types: when the backend lands, keep these shapes, or
// change them here and fix the compile errors in the UI.)
//
// Domain types for the kennel-owner dashboard. Names mirror the Prisma models
// and fields they imply (see ENDPOINTS.md). Everything that crosses the
// server/client boundary is plain serializable data: dates are ISO strings.

/** ISO 8601 timestamp, e.g. "2026-10-09T14:03:00.000Z". */
export type ISODateString = string;

// --- Enums (mirror Prisma enums) ------------------------------------------

/** Mirrors Prisma `DogStatus`. */
export type DogStatus = "BREEDING_STOCK" | "AVAILABLE_PUPPY" | "RESERVED" | "SOLD";

/** Mirrors Prisma `LitterStatus`. */
export type LitterStatus = "PLANNED" | "AVAILABLE" | "RESERVED" | "SOLD_OUT";

// --- Shell -----------------------------------------------------------------

/** The signed-in owner's kennel, for the sidebar and page greetings. Real data. */
export type CurrentKennel = {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
    logoUrl: string | null;
    ownerName: string;
    ownerInitials: string;
};

/** Sidebar count badges. Implies future `Lead` and `Message` models. */
export type NavCounts = {
    newLeads: number;
    unreadMessages: number;
};

/** Implies a future `Notification` model. `title`/`detail` are stored text. */
export type DashboardNotification = {
    id: string;
    title: string;
    detail: string;
    createdAt: ISODateString;
    read: boolean;
};

// --- Overview --------------------------------------------------------------

export type SetupStepKey = "kennelDetails" | "logoAndCover" | "breeds" | "firstDog" | "photos" | "verification";

export type SetupStep = {
    key: SetupStepKey;
    done: boolean;
};

export type OverviewMetrics = {
    newLeads: { count: number; sinceYesterday: number };
    unreadMessages: { count: number; oldestUnreadAt: ISODateString | null };
    availablePuppies: { count: number; litterCount: number };
    activeLitters: { count: number; nextGoHomeAt: ISODateString | null };
};

/**
 * Activity is stored as a type + params, never as rendered text: the UI
 * translates each type with its params (dashboard.overview.activity.*).
 */
export type ActivityItem =
    | { id: string; type: "NEW_LEAD"; params: { name: string; subject: string }; createdAt: ISODateString }
    | { id: string; type: "NEW_MESSAGE"; params: { name: string; excerpt: string }; createdAt: ISODateString }
    | { id: string; type: "NEW_REVIEW"; params: { authorName: string; rating: number }; createdAt: ISODateString }
    | { id: string; type: "DOG_STATUS_CHANGED"; params: { dogName: string; status: DogStatus }; createdAt: ISODateString }
    | { id: string; type: "LITTER_BORN"; params: { damName: string; puppyCount: number }; createdAt: ISODateString };

export type ActivityType = ActivityItem["type"];

export type UpcomingItem =
    | { id: string; type: "LEAD_FOLLOW_UP"; params: { leadName: string }; dueAt: ISODateString }
    | { id: string; type: "LITTER_GO_HOME"; params: { litterName: string; puppyCount: number; reservedCount: number }; dueAt: ISODateString };

export type Overview = {
    setupSteps: SetupStep[];
    metrics: OverviewMetrics;
    recentActivity: ActivityItem[];
    upcoming: UpcomingItem[];
};
