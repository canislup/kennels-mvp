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

/**
 * Implies a future `Notification` model. Stored as a type + params (like
 * activity) so the bell can show it in the viewer's language
 * (dashboard.shell.notifications.types.*).
 */
export type DashboardNotification =
    | { id: string; type: "NEW_LEAD"; params: { name: string }; createdAt: ISODateString; read: boolean }
    | { id: string; type: "NEW_MESSAGE"; params: { name: string; excerpt: string }; createdAt: ISODateString; read: boolean }
    | { id: string; type: "NEW_REVIEW"; params: { reviewerName: string; rating: number }; createdAt: ISODateString; read: boolean }
    | { id: string; type: "FOLLOW_UP_DUE"; params: { leadName: string }; createdAt: ISODateString; read: boolean }
    | { id: string; type: "VERIFICATION_REMINDER"; params: Record<string, never>; createdAt: ISODateString; read: boolean };

export type NotificationType = DashboardNotification["type"];

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
    | { id: string; type: "NEW_REVIEW"; params: { reviewerName: string; rating: number }; createdAt: ISODateString }
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

// --- Dogs ------------------------------------------------------------------

/**
 * Normalized sex. The schema stores free text in `Dog.gender` ("Male",
 * "MALE"…): the real implementation maps it case-insensitively and writes
 * "MALE" / "FEMALE".
 */
export type DogSex = "MALE" | "FEMALE";

/** Mirrors Prisma `DogLifeStage`. */
export type DogLifeStage = "PUPPY" | "ADULT";

/** One card on the Dogs list. */
export type DogListItem = {
    id: string;
    name: string;
    breed: string; // Dog.breed (free text, matches a Breed.name)
    sex: DogSex; // Dog.gender
    lifeStage: DogLifeStage;
    birthDate: string | null; // Dog.birthDate as YYYY-MM-DD
    status: DogStatus;
    coverPhotoUrl: string | null; // first photo (Media position 0 / photoUrls[0])
    archived: boolean; // Dog.archivedAt != null
};

export type DogListFilters = {
    status?: DogStatus;
    /** true = only archived dogs (status is then ignored); otherwise archived dogs are excluded. */
    archived?: boolean;
    /** Name, registry or registration number, case- and accent-insensitive. */
    q?: string;
    breed?: string;
    sex?: DogSex;
    stage?: DogLifeStage;
    page: number;
    pageSize: number;
};

export type DogListResult = {
    items: DogListItem[];
    total: number;
    page: number;
    pageSize: number;
};

/** Roster counts for the status tabs (archived dogs excluded, other filters ignored). */
export type DogStatusCounts = {
    all: number;
    breedingStock: number;
    availablePuppy: number;
    reserved: number;
    sold: number;
    /** Archived dogs (not included in `all`). */
    archived: number;
};

export type HealthDocument = {
    id: string;
    url: string;
    label: string; // NEW FIELD: Media.label
    fileName: string; // NEW FIELD: Media.fileName (original upload name)
};

/** Everything the Dog-Edit form shows. */
export type DogForEdit = {
    id: string;
    slug: string; // generated on create, never changes on rename
    name: string;
    breed: string;
    sex: DogSex;
    lifeStage: DogLifeStage;
    birthDate: string | null; // YYYY-MM-DD
    status: DogStatus;
    litterId: string | null; // NEW FIELD: Dog.litterId (optional relation to Litter)
    registry: string | null;
    registrationNumber: string | null; // NEW FIELD: Dog.registrationNumber, e.g. "BR-204518"
    lineage: string | null; // "Bloodline" in the UI
    pedigreeUrl: string | null;
    sireName: string | null;
    damName: string | null;
    bio: string | null;
    photos: string[]; // ordered, first is the cover. NEW FIELD: Media.position
    healthDocuments: HealthDocument[]; // NEW FIELD: Media.category = HEALTH_DOCUMENT
    archivedAt: ISODateString | null; // NEW FIELD: Dog.archivedAt
};

/** Validated, whitelisted input for createDog / updateDog (built by the server action). */
export type DogInput = Omit<DogForEdit, "id" | "slug" | "archivedAt">;

export type KennelBreedOption = { id: string; name: string };

export type LitterOption = {
    id: string;
    /** Display label built from stored names, e.g. "Pérola × Marley · Autumn litter". */
    label: string;
    bornAt: ISODateString | null;
};

// --- Litters -----------------------------------------------------------------

/** Calendar date without time, "YYYY-MM-DD" (form inputs, birth and go-home dates). */
export type DateOnlyString = string;

/** Computed per litter, never stored (see ENDPOINTS.md). */
export type LitterStats = {
    /** max(Litter.puppyCount, linked puppies). 0 = count not set. */
    totalPuppies: number;
    available: number; // linked puppies with status AVAILABLE_PUPPY
    reserved: number; // linked puppies with status RESERVED
    onWaitlist: number; // WaitlistEntry rows
    /** (total − available) ÷ total, 0–1; 0 when total is 0. */
    placedShare: number;
};

export type LitterListItem = {
    id: string;
    name: string; // Litter.name (exists, nullable in the schema)
    breed: string; // Litter.breed (free text, matches a Breed.name)
    status: LitterStatus;
    damName: string | null; // via Litter.damId → Dog.name
    sireName: string | null; // via Litter.sireId → Dog.name
    birthDate: DateOnlyString | null; // Litter.bornAt (exists)
    expectedGoHomeDate: DateOnlyString | null; // Litter.expectedGoHomeDate
    stats: LitterStats;
};

export type LitterStatusCounts = {
    all: number;
    planned: number;
    available: number;
    reserved: number;
    soldOut: number;
};

export type DogAge = { unit: "weeks" | "months" | "years"; count: number };

export type LitterParentSummary = {
    id: string;
    name: string;
    breed: string;
    /** Translated in the UI with dashboard.common.age.{unit}. null when no birth date. */
    ageLabelParts: DogAge | null;
    coverPhotoUrl: string | null;
};

export type LitterPuppy = {
    id: string;
    name: string;
    sex: DogSex;
    status: DogStatus;
    coverPhotoUrl: string | null;
};

export type LitterDetail = LitterListItem & {
    puppyCount: number; // Litter.puppyCount as entered (0 = not set)
    dam: LitterParentSummary | null;
    sire: LitterParentSummary | null;
    puppies: LitterPuppy[];
};

/** NEW MODEL: WaitlistEntry { id, litterId, leadId, position, note, createdAt }. `name` comes from the Lead. */
export type WaitlistEntry = {
    id: string;
    position: number;
    leadId: string;
    name: string;
    note: string | null;
    createdAt: ISODateString;
};

/** Everything the litter form edits. */
export type LitterForEdit = {
    id: string;
    name: string;
    breed: string;
    status: LitterStatus;
    damId: string | null;
    sireId: string | null;
    birthDate: DateOnlyString | null;
    expectedGoHomeDate: DateOnlyString | null;
    puppyCount: number; // 0–20, 0 = not set
};

/** Validated, whitelisted input for createLitter / updateLitter. */
export type LitterInput = Omit<LitterForEdit, "id">;

export type ParentOption = { id: string; name: string; breed: string };

export type LitterFormOptions = {
    breeds: KennelBreedOption[];
    /** Adult, non-archived females / males of this kennel (any breed: the form filters by breed). */
    females: ParentOption[];
    males: ParentOption[];
};

export type LinkablePuppy = LitterPuppy;

// --- Mutations ---------------------------------------------------------------

/** A validation problem as a translation key (dashboard.common.errors.*) + params. */
export type FieldError = { key: string; params?: Record<string, string | number> };

export type DogFormField = keyof DogInput;

export type MutationFailure<F extends string = string> = {
    ok: false;
    fieldErrors: Partial<Record<F, FieldError>>;
    formError?: FieldError;
};

export type DogMutationResult = { ok: true; dog: { id: string; slug: string } } | MutationFailure<DogFormField>;

export type SimpleMutationResult = { ok: true } | MutationFailure;

export type LitterFormField = keyof LitterInput;

export type LitterMutationResult = { ok: true; litter: { id: string } } | MutationFailure<LitterFormField>;
