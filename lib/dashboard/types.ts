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
    /** Owner.id (the session user), for the account-level functions. */
    ownerId: string;
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
    | { id: string; type: "LEAD_FOLLOW_UP"; params: { leadId: string; leadName: string }; dueAt: ISODateString }
    | { id: string; type: "LITTER_GO_HOME"; params: { litterId: string; litterName: string; puppyCount: number; reservedCount: number }; dueAt: ISODateString };

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
    archived: boolean; // Dog.archivedAt != null
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

export type ParentOption = {
    id: string;
    name: string;
    breed: string;
    /** Only the litter's current parent can be archived (kept so saving doesn't clear it). */
    archived: boolean;
};

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

// --- Leads -------------------------------------------------------------------

/** NEW ENUM (Prisma `LeadStage`). The first six are the board columns, in order; LOST is never a column. */
export type LeadStage = "NEW" | "CONTACTED" | "INTERESTED" | "FOLLOW_UP" | "RESERVED" | "SOLD" | "LOST";

/** The six pipeline stages (board columns, stepper, "Move to…"). */
export type BoardStage = Exclude<LeadStage, "LOST">;

/** NEW ENUM (Prisma `LostReason`). */
export type LostReason = "NO_RESPONSE" | "BOUGHT_ELSEWHERE" | "CHANGED_MIND" | "TOO_FAR" | "OTHER";

/** NEW ENUM (Prisma `LeadSource`). */
export type LeadSource = "PUBLIC_FORM" | "DIRECTORY" | "REFERRAL" | "OTHER";

/** NEW ENUM (Prisma `PreferredContact`). */
export type PreferredContact = "EMAIL" | "PHONE" | "WHATSAPP";

/** NEW MODEL: Lead. */
export type Lead = {
    id: string;
    name: string;
    email: string | null; // unique per kennel, compared lower-cased
    phone: string | null;
    preferredContact: PreferredContact;
    city: string | null;
    state: string | null;
    source: LeadSource;
    stage: LeadStage;
    interestBreed: string; // a KennelBreed name
    interestNote: string | null; // free text, e.g. "Chocolate female"
    litterId: string | null; // → Litter
    dogId: string | null; // → Dog
    /** Calendar day, "YYYY-MM-DD". Maps to a `@db.Date` column so time zones can't shift it. */
    followUpAt: DateOnlyString | null;
    firstMessage: string | null; // from the public contact form
    lostReason: LostReason | null; // NEW FIELD; set only while stage is LOST
    createdAt: ISODateString;
    lastActivityAt: ISODateString;
};

/**
 * NEW MODEL: LeadEvent, the lead's activity log. Stored as type + params,
 * translated in the UI. Notes and messages live in their own tables; the
 * timeline is the union of events, notes and messages (see TimelineItem).
 */
export type LeadEvent =
    | { id: string; leadId: string; type: "CREATED"; params: { source: LeadSource }; createdAt: ISODateString }
    | { id: string; leadId: string; type: "STAGE_CHANGED"; params: { from: LeadStage; to: LeadStage; /** Moved by the system, e.g. New → Contacted on the first reply. */ auto?: boolean }; createdAt: ISODateString }
    | { id: string; leadId: string; type: "FOLLOW_UP_SET"; params: { date: DateOnlyString }; createdAt: ISODateString }
    | { id: string; leadId: string; type: "FOLLOW_UP_DONE"; params: { date: DateOnlyString }; createdAt: ISODateString }
    | { id: string; leadId: string; type: "MARKED_LOST"; params: { from: LeadStage; reason: LostReason }; createdAt: ISODateString }
    | { id: string; leadId: string; type: "REOPENED"; params: { to: LeadStage }; createdAt: ISODateString }
    | { id: string; leadId: string; type: "PUPPY_RESERVED"; params: { dogId: string; dogName: string }; createdAt: ISODateString }
    | { id: string; leadId: string; type: "PUPPY_RELEASED"; params: { dogId: string; dogName: string }; createdAt: ISODateString }
    | { id: string; leadId: string; type: "WAITLIST_ADDED"; params: { litterId: string; litterName: string }; createdAt: ISODateString }
    | { id: string; leadId: string; type: "WAITLIST_REMOVED"; params: { litterId: string; litterName: string }; createdAt: ISODateString };

export type LeadEventType = LeadEvent["type"];

/** One card on the board / one row in the list view. */
export type LeadCard = {
    id: string;
    name: string;
    stage: LeadStage;
    source: LeadSource;
    interestBreed: string;
    interestNote: string | null;
    litterName: string | null; // via Lead.litterId
    dogName: string | null; // via Lead.dogId
    followUpAt: DateOnlyString | null;
    lastActivityAt: ISODateString;
    /** Derived: the lead's conversation has an inbound message with readAt null. */
    hasUnread: boolean;
    lostReason: LostReason | null;
};

export type LeadFollowUpFilter = "any" | "due" | "set" | "none";

export type LeadFilters = {
    /** Name, email, interest note, linked dog or litter name; case- and accent-insensitive. */
    q?: string;
    breed?: string;
    source?: LeadSource;
    followUp?: LeadFollowUpFilter;
    /** List view only. Omitted = every stage except LOST; "LOST" = only lost leads. */
    stage?: LeadStage;
};

export type LeadBoardColumn = {
    stage: BoardStage;
    /** Leads in this stage matching the filters (for Sold: only those in `cards`). */
    count: number;
    cards: LeadCard[];
    /** Sold only: older sold leads exist that the board leaves out (they're in the list view). */
    truncated: boolean;
};

export type LeadBoard = { columns: LeadBoardColumn[] };

export type LeadTableResult = { items: LeadCard[]; total: number; page: number; pageSize: number };

export type FollowUpSummary = { dueCount: number; names: string[] };

export type UpcomingFollowUp = { leadId: string; name: string; followUpAt: DateOnlyString };

export type LeadFormOptions = {
    breeds: KennelBreedOption[];
    litters: { id: string; name: string; breed: string }[];
    dogs: { id: string; name: string; breed: string }[]; // non-archived
};

/** Validated, whitelisted input for createLead (updateLead ignores `stage`). */
export type LeadInput = Omit<Lead, "id" | "firstMessage" | "lostReason" | "createdAt" | "lastActivityAt">;

export type LeadFormField = keyof LeadInput;

export type LeadMutationResult = { ok: true; lead: { id: string } } | MutationFailure<LeadFormField>;

export type LitterMutationResult = { ok: true; litter: { id: string } } | MutationFailure<LitterFormField>;

// --- Lead detail (Step 4b) -------------------------------------------------------

/** NEW MODEL: LeadNote. Private to the kennel. */
export type LeadNote = { id: string; leadId: string; body: string; createdAt: ISODateString };

/** NEW MODEL: Conversation (one per lead). */
export type Conversation = { id: string; leadId: string; lastMessageAt: ISODateString };

export type MessageDirection = "INBOUND" | "OUTBOUND";

/** NEW MODEL: Message. INBOUND = from the buyer; readAt null = unread by the kennel. */
export type Message = {
    id: string;
    conversationId: string;
    direction: MessageDirection;
    /** May be empty when the message only shares a dog. */
    body: string;
    sharedDogId: string | null; // NEW FIELD: Message.sharedDogId → Dog (the dog card in the thread)
    createdAt: ISODateString;
    readAt: ISODateString | null;
};

/** One row of the lead timeline: the union of LeadEvent, LeadNote and Message, newest first. */
export type TimelineItem =
    | { id: string; kind: "event"; type: LeadEvent["type"]; params: LeadEvent["params"]; createdAt: ISODateString }
    | { id: string; kind: "note"; body: string; createdAt: ISODateString }
    | { id: string; kind: "message"; direction: MessageDirection; body: string; sharedDogName: string | null; createdAt: ISODateString };

export type LeadWaitlistEntry = { entryId: string; litterId: string; litterName: string; position: number };

export type LeadDetail = Lead & {
    litter: { id: string; name: string } | null;
    dog: { id: string; name: string; status: DogStatus } | null;
    /** The puppy this lead holds (reserved for them). NEW FIELD in the real schema: Dog.reservedForLeadId. */
    reservation: { dogId: string; dogName: string } | null;
    hasUnread: boolean;
    timeline: TimelineItem[];
    /** More than the returned timeline exists (the page offers "Show full history"). */
    timelineHasMore: boolean;
    recentMessages: ThreadMessage[]; // the last 3, oldest first
    conversationId: string | null;
    waitlists: LeadWaitlistEntry[];
};

export type WaitlistOption = { id: string; name: string; breed: string; status: LitterStatus };

export type ReservablePuppy = {
    id: string;
    name: string;
    sex: DogSex;
    breed: string;
    litterName: string | null;
    coverPhotoUrl: string | null;
};

/** Result of a form submitted from a dialog or an inline form (useActionState). */
export type ActionState = {
    status: "idle" | "error" | "done";
    fieldErrors: Record<string, FieldError>;
    formError?: FieldError;
    /** Increments on every submit, so the client can react to each result once. */
    submission: number;
};

// --- Messages (Step 5) ---------------------------------------------------------------

export type SharedDogSummary = { id: string; name: string; breed: string; sex: DogSex; ageParts: DogAge | null; coverPhotoUrl: string | null };

export type ThreadMessage = Message & { sharedDog: SharedDogSummary | null };

export type ConversationListItem = {
    id: string;
    leadId: string;
    leadName: string;
    initials: string;
    /** The last message: its text, or a marker the UI translates ("Shared Mocha"). */
    lastMessagePreview: { kind: "text"; text: string; direction: MessageDirection } | { kind: "dog"; dogName: string; direction: MessageDirection } | { kind: "none" };
    lastMessageAt: ISODateString;
    unreadCount: number;
};

export type ConversationLeadSummary = {
    id: string;
    name: string;
    stage: LeadStage;
    interestBreed: string;
    interestNote: string | null;
    litterName: string | null;
    dog: { id: string; name: string; litterName: string | null } | null; // dog of interest (Lead.dogId)
    followUpAt: DateOnlyString | null;
    email: string | null;
    phone: string | null;
};

export type ConversationThread = {
    conversation: Conversation;
    lead: ConversationLeadSummary;
    messages: ThreadMessage[]; // oldest first
};

export type ShareableDog = { id: string; name: string; breed: string; sex: DogSex; status: DogStatus; coverPhotoUrl: string | null };

export type UnreadSummary = { unreadConversations: number; oldestUnreadAt: ISODateString | null };

// --- Media (Step 5) --------------------------------------------------------------------

export type MediaKind = "PHOTO" | "VIDEO";
export type VideoProvider = "YOUTUBE" | "VIMEO";

/** Kennel gallery item (existing `Media` model). */
export type MediaItem = {
    id: string;
    type: MediaKind;
    url: string | null; // Media.url (required in the schema; null only in fixtures → gradient)
    caption: string | null; // NEW FIELD: Media.caption (photo caption / video title, ≤ 120)
    breed: string | null; // via Media.breedId (null = all breeds)
    dogId: string | null; // Media.dogId (null = whole kennel)
    dogName: string | null;
    position: number; // NEW FIELD: Media.position (photos: gallery order)
    createdAt: ISODateString;
    provider: VideoProvider | null; // NEW FIELD: Media.provider (videos only)
    thumbnailUrl: string | null; // NEW FIELD: Media.thumbnailUrl (videos only)
};

export type MediaListResult = { items: MediaItem[]; total: number; page: number; pageSize: number };

export type MediaFilterOptions = { breeds: KennelBreedOption[]; dogs: { id: string; name: string; breed: string }[] };

export type PhotoUpload = { url: string; width?: number; height?: number };

// --- Reviews (Step 6a) ---------------------------------------------------------------

/** NEW MODEL `ReviewReply` (or reply columns on `Review`): the kennel's one public reply. */
export type ReviewReply = { body: string; createdAt: ISODateString; updatedAt: ISODateString };

export type ReviewReportReason = "INAPPROPRIATE" | "NOT_A_BUYER" | "SPAM" | "OTHER";

/** NEW MODEL `Review`. Written by the public review page from an invite (not built yet). */
export type Review = {
    id: string;
    reviewerName: string;
    /** e.g. "Bought Café, Labrador". Free text snapshotted when the review is created. */
    purchaseLabel: string | null;
    /** The reviewer came from one of this kennel's invites ("Verified buyer"). */
    verified: boolean;
    /** 1 to 5. */
    rating: number;
    body: string;
    createdAt: ISODateString;
    reply: ReviewReply | null;
    /** Set when the kennel reports it; the review stays public until moderation. */
    reportedAt: ISODateString | null;
    reportReason: ReviewReportReason | null;
    /** The kennel's optional explanation, ≤ 500 (for the moderator; never public). */
    reportDetails: string | null;
};

export type ReviewStatusFilter = "all" | "needs-reply" | "replied" | "reported";

export type ReviewSummary = {
    /** One decimal, 0 when there are no reviews. */
    average: number;
    total: number;
    /** 5 stars down to 1. `percent` is a whole number of the total. */
    distribution: { stars: number; count: number; percent: number }[];
    needsReply: number;
    replied: number;
    reported: number;
};

export type ReviewListResult = { items: Review[]; total: number; page: number; pageSize: number };

/** NEW MODEL `ReviewInvite`: a single-use link that lets one buyer leave one review. */
export type ReviewInvite = {
    id: string;
    email: string | null;
    token: string;
    createdAt: ISODateString;
    usedAt: ISODateString | null;
    /** Always null in this version: there is no email sending. */
    emailSentAt: ISODateString | null;
};

export type ReviewInviteResult = { ok: true; inviteId: string; url: string; emailSent: false } | MutationFailure;

// --- Settings: account, notifications, verification (Step 6a) ------------------------

export type AppLocale = "en" | "pt-BR";

/** Owner.fullName, Owner.email, and NEW FIELD Owner.locale. */
export type Account = { fullName: string; email: string; locale: AppLocale };

export type PasswordChangeInput = { currentPassword: string; newPassword: string; confirmPassword: string };

/** NEW MODEL `NotificationPreference` (ownerId, type, emailEnabled). */
export type NotificationPreferenceType = "NEW_LEAD" | "NEW_MESSAGE" | "NEW_REVIEW" | "WAITLIST_ACTIVITY" | "VERIFICATION_UPDATE";

export type NotificationPreference = { type: NotificationPreferenceType; emailEnabled: boolean };

export type VerificationStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";

/** NEW MODEL `VerificationRequest` (one current request per kennel). */
export type VerificationRequest = {
    id: string;
    status: VerificationStatus;
    cbkcRegistration: string | null;
    /** Cloudinary URLs of the proof documents (images), 1 to 5. */
    documentUrls: string[];
    submittedAt: ISODateString | null;
    decidedAt: ISODateString | null;
    /** The reviewer's note (shown when REJECTED). */
    reviewerNote: string | null;
};

/**
 * How the kennel is registered. `Kennel.cnpj` exists; a CPF (individual
 * breeder) is a NEW FIELD (`Kennel.cpf` or a type + number pair). The number
 * is always masked on the server: a full CPF never reaches the browser.
 */
export type RegistrationSummary = { type: "CNPJ" | "CPF"; maskedNumber: string };

export type VerificationView = {
    request: VerificationRequest;
    registration: RegistrationSummary | null;
    registrationMissing: boolean;
    /** The kennel's CBKC number on file (Kennel.cbkcRegistration), to prefill the form. */
    cbkcOnFile: string | null;
};
