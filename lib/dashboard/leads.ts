// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Leads: board, list view, Add/Edit lead, the lead page and its actions,
// and the follow-up numbers used by Overview and the nav. Reads are called
// from Server Components; mutations from the Server Actions in
// app/[locale]/dashboard/leads/actions.ts, which have already parsed input
// into whitelisted, validated values. "Today" is the viewer's calendar day
// (getViewerToday). See ENDPOINTS.md for every function's backend contract.
import { getMockStore, snapshot } from "./mock/store";
import { addDays, getViewerToday } from "./viewerDate";
import { toThreadMessage } from "./messages";
import type {
    BoardStage,
    FollowUpSummary,
    Lead,
    LeadBoard,
    LeadCard,
    LeadDetail,
    LeadEvent,
    LeadFilters,
    LeadFormOptions,
    LeadInput,
    LeadMutationResult,
    LeadStage,
    LeadTableResult,
    LostReason,
    Message,
    ReservablePuppy,
    SimpleMutationResult,
    TimelineItem,
    UpcomingFollowUp,
    WaitlistOption,
} from "./types";

/** The six pipeline stages (board columns). LOST is not one of them. */
export const LEAD_STAGES: readonly BoardStage[] = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "RESERVED", "SOLD"];

export const LOST_REASONS: readonly LostReason[] = ["NO_RESPONSE", "BOUGHT_ELSEWHERE", "CHANGED_MIND", "TOO_FAR", "OTHER"];

/** Sold leads older than this (by last activity) stay off the board. */
const SOLD_BOARD_WINDOW_DAYS = 90;

/** Stages whose follow-ups still need doing (not Reserved, Sold or Lost). */
const OPEN_STAGES: readonly LeadStage[] = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP"];

/** The timeline returns this many items unless the page asks for the full history. */
const TIMELINE_LIMIT = 30;

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const newestActivity = (a: Lead, b: Lead) => b.lastActivityAt.localeCompare(a.lastActivityAt);

const notFound = (): { ok: false; fieldErrors: Record<string, never>; formError: { key: string } } => ({ ok: false, fieldErrors: {}, formError: { key: "notFound" } });

const findLead = (leadId: string) => getMockStore().leads.find((lead) => lead.id === leadId);

const conversationOf = (leadId: string) => getMockStore().conversations.find((c) => c.leadId === leadId);

/** Derived, never stored: the lead's conversation has an inbound message nobody has read. */
function leadHasUnread(leadId: string): boolean {
    const conversation = conversationOf(leadId);
    return Boolean(conversation && getMockStore().messages.some((m) => m.conversationId === conversation.id && m.direction === "INBOUND" && m.readAt === null));
}

/** The puppy reserved for this lead, if it's still reserved (stand-in for Dog.reservedForLeadId). */
function heldPuppy(leadId: string) {
    const store = getMockStore();
    const link = store.reservations.find((r) => r.leadId === leadId);
    const dog = link && store.dogs.find((d) => d.id === link.dogId);
    return dog && dog.status === "RESERVED" ? dog : undefined;
}

function toCard(lead: Lead): LeadCard {
    const store = getMockStore();
    return {
        id: lead.id,
        name: lead.name,
        stage: lead.stage,
        source: lead.source,
        interestBreed: lead.interestBreed,
        interestNote: lead.interestNote,
        litterName: lead.litterId ? (store.litters.find((l) => l.id === lead.litterId)?.name ?? null) : null,
        dogName: lead.dogId ? (store.dogs.find((d) => d.id === lead.dogId)?.name ?? null) : null,
        followUpAt: lead.followUpAt,
        lastActivityAt: lead.lastActivityAt,
        hasUnread: leadHasUnread(lead.id),
        lostReason: lead.lostReason,
    };
}

/** Leads matching the filters. Without `stage`, lost leads are left out; `stage: "LOST"` returns only them. */
function filterLeads(filters: LeadFilters, today: string): Lead[] {
    const q = filters.q ? fold(filters.q.trim()) : "";
    return getMockStore().leads.filter((lead) => {
        if (filters.stage ? lead.stage !== filters.stage : lead.stage === "LOST") return false;
        if (filters.breed && lead.interestBreed !== filters.breed) return false;
        if (filters.source && lead.source !== filters.source) return false;
        if (filters.followUp === "due" && !(lead.followUpAt && lead.followUpAt <= today)) return false;
        if (filters.followUp === "set" && !lead.followUpAt) return false;
        if (filters.followUp === "none" && lead.followUpAt) return false;
        if (q) {
            const card = toCard(lead);
            const haystack = [lead.name, lead.email, lead.interestNote, card.dogName, card.litterName];
            if (!haystack.some((value) => value && fold(value).includes(q))) return false;
        }
        return true;
    });
}

// --- Reads: board, list, Overview ------------------------------------------------

/**
 * Six columns in stage order, cards by last activity (newest first). Counts
 * follow the filters. Sold only shows leads active in the last 90 days.
 * Lost leads never appear (and `filters.stage` is ignored).
 */
export async function listLeadsBoard(kennelId: string, filters: LeadFilters): Promise<LeadBoard> {
    void kennelId;
    const today = await getViewerToday();
    const soldCutoff = new Date(Date.now() - SOLD_BOARD_WINDOW_DAYS * 86_400_000).toISOString();
    const matches = filterLeads({ ...filters, stage: undefined }, today).sort(newestActivity);
    return snapshot({
        columns: LEAD_STAGES.map((stage) => {
            const inStage = matches.filter((lead) => lead.stage === stage);
            const shown = stage === "SOLD" ? inStage.filter((lead) => lead.lastActivityAt >= soldCutoff) : inStage;
            return { stage, count: shown.length, cards: shown.map(toCard), truncated: shown.length < inStage.length };
        }),
    });
}

/** Matching leads (no 90-day limit; lost ones only with `stage: "LOST"`), by last activity, one page. */
export async function listLeadsTable(kennelId: string, filters: LeadFilters, paging: { page: number; pageSize: number }): Promise<LeadTableResult> {
    void kennelId;
    const matches = filterLeads(filters, await getViewerToday()).sort(newestActivity);
    const start = (paging.page - 1) * paging.pageSize;
    return snapshot({ items: matches.slice(start, start + paging.pageSize).map(toCard), total: matches.length, page: paging.page, pageSize: paging.pageSize });
}

/** Open leads (not Reserved, Sold or Lost) whose follow-up is today or earlier. */
export async function getFollowUpSummary(kennelId: string): Promise<FollowUpSummary> {
    void kennelId;
    const today = await getViewerToday();
    const due = getMockStore()
        .leads.filter((lead) => OPEN_STAGES.includes(lead.stage) && lead.followUpAt && lead.followUpAt <= today)
        .sort((a, b) => a.followUpAt!.localeCompare(b.followUpAt!) || a.name.localeCompare(b.name));
    return { dueCount: due.length, names: due.map((lead) => lead.name) };
}

export async function getLeadSummary(kennelId: string, leadId: string): Promise<Lead | null> {
    void kennelId;
    const lead = findLead(leadId);
    return lead ? snapshot(lead) : null;
}

export async function getLeadFormOptions(kennelId: string): Promise<LeadFormOptions> {
    void kennelId;
    const store = getMockStore();
    const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);
    return snapshot({
        breeds: [...store.kennelBreeds].sort(byName),
        litters: store.litters.map(({ id, name, breed }) => ({ id, name, breed })).sort(byName),
        dogs: store.dogs
            .filter((dog) => dog.archivedAt === null)
            .map(({ id, name, breed }) => ({ id, name, breed }))
            .sort(byName),
    });
}

/** Next follow-ups of open leads, overdue first (earliest date first). */
export async function getUpcomingFollowUps(kennelId: string, limit: number): Promise<UpcomingFollowUp[]> {
    void kennelId;
    return snapshot(
        getMockStore()
            .leads.filter((lead) => OPEN_STAGES.includes(lead.stage) && lead.followUpAt)
            .sort((a, b) => a.followUpAt!.localeCompare(b.followUpAt!) || a.name.localeCompare(b.name))
            .slice(0, limit)
            .map((lead) => ({ leadId: lead.id, name: lead.name, followUpAt: lead.followUpAt! })),
    );
}

/** Leads in stage New (sidebar badge, Overview metric). */
export async function countNewLeads(kennelId: string): Promise<{ count: number; sinceYesterday: number }> {
    void kennelId;
    const yesterday = addDays(await getViewerToday(), -1);
    const fresh = getMockStore().leads.filter((lead) => lead.stage === "NEW");
    return {
        count: fresh.length,
        // Calendar day of createdAt in UTC is close enough for a mock; the real query uses the kennel's time zone.
        sinceYesterday: fresh.filter((lead) => lead.createdAt.slice(0, 10) >= yesterday).length,
    };
}

// --- Reads: lead page ---------------------------------------------------------------

/**
 * Everything the lead page shows, or null if the lead doesn't exist or isn't
 * this kennel's. The timeline merges events, notes and messages, newest
 * first: the latest 30, or all with `history: "all"`.
 */
export async function getLeadDetail(kennelId: string, leadId: string, options: { history?: "recent" | "all" } = {}): Promise<LeadDetail | null> {
    void kennelId;
    const store = getMockStore();
    const lead = findLead(leadId);
    if (!lead) return null;

    const conversation = conversationOf(leadId);
    const messages: Message[] = conversation ? store.messages.filter((m) => m.conversationId === conversation.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [];
    const timeline: TimelineItem[] = [
        ...store.leadEvents.filter((e) => e.leadId === leadId).map((e): TimelineItem => ({ id: e.id, kind: "event", type: e.type, params: e.params, createdAt: e.createdAt })),
        ...store.leadNotes.filter((n) => n.leadId === leadId).map((n): TimelineItem => ({ id: n.id, kind: "note", body: n.body, createdAt: n.createdAt })),
        ...messages.map((m): TimelineItem => ({
            id: m.id,
            kind: "message",
            direction: m.direction,
            body: m.body,
            sharedDogName: m.sharedDogId ? (store.dogs.find((d) => d.id === m.sharedDogId)?.name ?? null) : null,
            createdAt: m.createdAt,
        })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const shown = options.history === "all" ? timeline : timeline.slice(0, TIMELINE_LIMIT);

    const litter = lead.litterId ? store.litters.find((l) => l.id === lead.litterId) : undefined;
    const dog = lead.dogId ? store.dogs.find((d) => d.id === lead.dogId) : undefined;
    const held = heldPuppy(leadId);

    return snapshot({
        ...lead,
        litter: litter ? { id: litter.id, name: litter.name } : null,
        dog: dog ? { id: dog.id, name: dog.name, status: dog.status } : null,
        reservation: held ? { dogId: held.id, dogName: held.name } : null,
        hasUnread: leadHasUnread(leadId),
        timeline: shown,
        timelineHasMore: shown.length < timeline.length,
        recentMessages: messages.slice(-3).map(toThreadMessage),
        conversationId: conversation?.id ?? null,
        waitlists: store.waitlist
            .filter((entry) => entry.leadId === leadId)
            .map((entry) => ({ entryId: entry.id, litterId: entry.litterId, litterName: store.litters.find((l) => l.id === entry.litterId)?.name ?? "", position: entry.position }))
            .sort((a, b) => a.litterName.localeCompare(b.litterName)),
    });
}

/** Litters (Planned, Available or Reserved) this lead isn't waiting for yet. */
export async function getWaitlistOptions(kennelId: string, leadId: string): Promise<WaitlistOption[]> {
    void kennelId;
    const store = getMockStore();
    const already = new Set(store.waitlist.filter((e) => e.leadId === leadId).map((e) => e.litterId));
    return snapshot(
        store.litters
            .filter((l) => (l.status === "PLANNED" || l.status === "AVAILABLE" || l.status === "RESERVED") && !already.has(l.id))
            .map(({ id, name, breed, status }) => ({ id, name, breed, status }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    );
}

/** Non-archived puppies with status Available puppy; the lead's interest breed first. */
export async function getReservablePuppies(kennelId: string, leadId: string): Promise<ReservablePuppy[]> {
    void kennelId;
    const store = getMockStore();
    const breed = findLead(leadId)?.interestBreed;
    return snapshot(
        store.dogs
            .filter((d) => d.archivedAt === null && d.status === "AVAILABLE_PUPPY")
            .sort((a, b) => Number(b.breed === breed) - Number(a.breed === breed) || a.name.localeCompare(b.name))
            .map((d) => ({
                id: d.id,
                name: d.name,
                sex: d.sex,
                breed: d.breed,
                litterName: d.litterId ? (store.litters.find((l) => l.id === d.litterId)?.name ?? null) : null,
                coverPhotoUrl: d.photos[0] ?? null,
            })),
    );
}

// --- Mutations -----------------------------------------------------------------------

function logEvent(event: Omit<LeadEvent, "id" | "createdAt">) {
    getMockStore().leadEvents.push({ ...event, id: `evt_${crypto.randomUUID()}`, createdAt: new Date().toISOString() } as LeadEvent);
}

const touch = (lead: Lead) => {
    lead.lastActivityAt = new Date().toISOString();
};

/** Another lead in this kennel with the same email (case-insensitive), excluding `exceptId`. */
function duplicateOf(email: string | null, exceptId?: string): Lead | undefined {
    const wanted = email?.toLowerCase();
    return wanted ? getMockStore().leads.find((lead) => lead.id !== exceptId && lead.email?.toLowerCase() === wanted) : undefined;
}

function duplicateFailure(existing: Lead): LeadMutationResult {
    return { ok: false, fieldErrors: { email: { key: "duplicateLeadEmail" } }, formError: { key: "duplicateLead", params: { leadId: existing.id, name: existing.name } } };
}

/** Creates a lead (and its CREATED / FOLLOW_UP_SET events). One lead per email per kennel. */
export async function createLead(kennelId: string, input: LeadInput): Promise<LeadMutationResult> {
    void kennelId;
    const existing = duplicateOf(input.email);
    if (existing) return duplicateFailure(existing);
    const now = new Date().toISOString();
    const lead: Lead = { ...input, id: `lead_${crypto.randomUUID()}`, firstMessage: null, lostReason: null, createdAt: now, lastActivityAt: now };
    getMockStore().leads.push(lead);
    logEvent({ leadId: lead.id, type: "CREATED", params: { source: lead.source } });
    if (lead.followUpAt) logEvent({ leadId: lead.id, type: "FOLLOW_UP_SET", params: { date: lead.followUpAt } });
    return { ok: true, lead: { id: lead.id } };
}

/** Edits the lead's own fields. The stage is not editable here (use moveLeadStage / the lost flow). */
export async function updateLead(kennelId: string, leadId: string, input: LeadInput): Promise<LeadMutationResult> {
    void kennelId;
    const lead = findLead(leadId);
    if (!lead) return notFound();
    const existing = duplicateOf(input.email, leadId);
    if (existing) return duplicateFailure(existing);
    const previousFollowUp = lead.followUpAt;
    const { stage: _ignoredStage, ...editable } = input;
    void _ignoredStage;
    Object.assign(lead, editable);
    if (lead.followUpAt && lead.followUpAt !== previousFollowUp) logEvent({ leadId, type: "FOLLOW_UP_SET", params: { date: lead.followUpAt } });
    touch(lead);
    return { ok: true, lead: { id: lead.id } };
}

/** Board or detail-page move between the six stages. Only the stage changes (see ENDPOINTS.md on dog status). */
export async function moveLeadStage(kennelId: string, leadId: string, stage: BoardStage): Promise<SimpleMutationResult> {
    void kennelId;
    const lead = findLead(leadId);
    if (!lead) return notFound();
    if (lead.stage === "LOST") return { ok: false, fieldErrors: {}, formError: { key: "leadIsLost" } };
    if (lead.stage === stage) return { ok: true };
    logEvent({ leadId, type: "STAGE_CHANGED", params: { from: lead.stage, to: stage } });
    lead.stage = stage;
    touch(lead);
    return { ok: true };
}

export async function addLeadNote(kennelId: string, leadId: string, body: string): Promise<SimpleMutationResult> {
    void kennelId;
    const lead = findLead(leadId);
    if (!lead) return notFound();
    getMockStore().leadNotes.push({ id: `note_${crypto.randomUUID()}`, leadId, body, createdAt: new Date().toISOString() });
    touch(lead);
    return { ok: true };
}

/** Sets (or clears, with null) the follow-up date. The action has already refused past dates. */
export async function setFollowUp(kennelId: string, leadId: string, date: string | null): Promise<SimpleMutationResult> {
    void kennelId;
    const lead = findLead(leadId);
    if (!lead) return notFound();
    if (lead.stage === "LOST") return { ok: false, fieldErrors: {}, formError: { key: "followUpLeadLost" } };
    lead.followUpAt = date;
    if (date) logEvent({ leadId, type: "FOLLOW_UP_SET", params: { date } });
    touch(lead);
    return { ok: true };
}

export async function markFollowUpDone(kennelId: string, leadId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const lead = findLead(leadId);
    if (!lead) return notFound();
    if (!lead.followUpAt) return { ok: true };
    logEvent({ leadId, type: "FOLLOW_UP_DONE", params: { date: lead.followUpAt } });
    lead.followUpAt = null;
    touch(lead);
    return { ok: true };
}

/**
 * Deletes the lead with its notes, events, conversation, messages and
 * waitlist entries (later entries move up). Refused while it holds a puppy.
 */
export async function deleteLead(kennelId: string, leadId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const lead = findLead(leadId);
    if (!lead) return notFound();
    const held = heldPuppy(leadId);
    if (held) return { ok: false, fieldErrors: {}, formError: { key: "releasePuppyFirst", params: { dogName: held.name } } };

    for (const entry of store.waitlist.filter((e) => e.leadId === leadId)) removeEntry(entry.id);
    const conversation = conversationOf(leadId);
    if (conversation) {
        store.messages = store.messages.filter((m) => m.conversationId !== conversation.id);
        store.conversations = store.conversations.filter((c) => c.id !== conversation.id);
    }
    store.leadNotes = store.leadNotes.filter((n) => n.leadId !== leadId);
    store.leadEvents = store.leadEvents.filter((e) => e.leadId !== leadId);
    store.reservations = store.reservations.filter((r) => r.leadId !== leadId);
    store.leads = store.leads.filter((l) => l.id !== leadId);
    return { ok: true };
}

/** Marks the lead Lost: clears the follow-up; optionally makes their reserved puppy available again. */
export async function markLeadLost(kennelId: string, leadId: string, options: { reason: LostReason; releasePuppy: boolean }): Promise<SimpleMutationResult> {
    void kennelId;
    const lead = findLead(leadId);
    if (!lead) return notFound();
    if (lead.stage === "LOST") return { ok: true };
    logEvent({ leadId, type: "MARKED_LOST", params: { from: lead.stage, reason: options.reason } });
    lead.stage = "LOST";
    lead.lostReason = options.reason;
    lead.followUpAt = null;
    if (options.releasePuppy) release(lead);
    touch(lead);
    return { ok: true };
}

/**
 * Back to the stage it had before it was lost, except Reserved when the lead
 * no longer holds a reserved puppy: then Interested. The follow-up and a
 * released puppy are not restored.
 */
export async function reopenLead(kennelId: string, leadId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const lead = findLead(leadId);
    if (!lead) return notFound();
    if (lead.stage !== "LOST") return { ok: true };
    const lost = [...getMockStore().leadEvents]
        .filter((e): e is Extract<LeadEvent, { type: "MARKED_LOST" }> => e.leadId === leadId && e.type === "MARKED_LOST")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    let to: LeadStage = lost && lost.params.from !== "LOST" ? lost.params.from : "CONTACTED";
    if (to === "RESERVED" && !heldPuppy(leadId)) to = "INTERESTED";
    lead.stage = to;
    lead.lostReason = null;
    logEvent({ leadId, type: "REOPENED", params: { to } });
    touch(lead);
    return { ok: true };
}

/** Reserves an available puppy for this lead: dog → Reserved, lead.dogId, lead stage → Reserved. */
export async function reservePuppy(kennelId: string, leadId: string, dogId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const lead = findLead(leadId);
    const dog = store.dogs.find((d) => d.id === dogId);
    if (!lead || !dog) return notFound();
    if (heldPuppy(leadId)) return { ok: false, fieldErrors: {}, formError: { key: "alreadyHoldsPuppy" } };
    // Guarded update: only if it's still available right now (the real backend does this in one transaction).
    if (dog.archivedAt !== null || dog.status !== "AVAILABLE_PUPPY") return { ok: false, fieldErrors: {}, formError: { key: "puppyJustReserved", params: { dogName: dog.name } } };
    dog.status = "RESERVED";
    store.reservations = [...store.reservations.filter((r) => r.dogId !== dogId), { leadId, dogId }];
    lead.dogId = dogId;
    lead.stage = "RESERVED";
    logEvent({ leadId, type: "PUPPY_RESERVED", params: { dogId, dogName: dog.name } });
    touch(lead);
    return { ok: true };
}

/** Makes the held puppy available again (shared by releasePuppy and markLeadLost). */
function release(lead: Lead): boolean {
    const dog = heldPuppy(lead.id);
    if (!dog) return false;
    const store = getMockStore();
    dog.status = "AVAILABLE_PUPPY";
    store.reservations = store.reservations.filter((r) => r.leadId !== lead.id);
    if (lead.dogId === dog.id) lead.dogId = null;
    logEvent({ leadId: lead.id, type: "PUPPY_RELEASED", params: { dogId: dog.id, dogName: dog.name } });
    return true;
}

/** Dog back to Available puppy, lead.dogId cleared, the lead goes back to Interested. */
export async function releasePuppy(kennelId: string, leadId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const lead = findLead(leadId);
    if (!lead) return notFound();
    if (!release(lead)) return { ok: false, fieldErrors: {}, formError: { key: "noPuppyHeld" } };
    if (lead.stage !== "LOST") lead.stage = "INTERESTED";
    touch(lead);
    return { ok: true };
}

/** Appends the lead to the end of a litter's waitlist (once per litter). */
export async function addToWaitlist(kennelId: string, leadId: string, litterId: string, note: string | null): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const lead = findLead(leadId);
    const litter = store.litters.find((l) => l.id === litterId);
    if (!lead || !litter) return notFound();
    if (store.waitlist.some((e) => e.leadId === leadId && e.litterId === litterId)) return { ok: false, fieldErrors: { litterId: { key: "alreadyOnWaitlist" } } };
    const position = Math.max(0, ...store.waitlist.filter((e) => e.litterId === litterId).map((e) => e.position)) + 1;
    store.waitlist.push({ id: `wl_${crypto.randomUUID()}`, litterId, leadId, position, note, createdAt: new Date().toISOString() });
    logEvent({ leadId, type: "WAITLIST_ADDED", params: { litterId, litterName: litter.name } });
    touch(lead);
    return { ok: true };
}

/** Removes the entry and moves the later entries of that litter up one position. */
function removeEntry(entryId: string) {
    const store = getMockStore();
    const entry = store.waitlist.find((e) => e.id === entryId);
    if (!entry) return undefined;
    store.waitlist = store.waitlist.filter((e) => e.id !== entryId);
    for (const other of store.waitlist) if (other.litterId === entry.litterId && other.position > entry.position) other.position--;
    return entry;
}

export async function removeFromWaitlist(kennelId: string, entryId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const entry = removeEntry(entryId);
    if (!entry) return notFound();
    const litterName = store.litters.find((l) => l.id === entry.litterId)?.name ?? "";
    logEvent({ leadId: entry.leadId, type: "WAITLIST_REMOVED", params: { litterId: entry.litterId, litterName } });
    const lead = findLead(entry.leadId);
    if (lead) touch(lead);
    return { ok: true };
}
