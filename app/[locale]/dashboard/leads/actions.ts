"use server";

// Server Actions for the Leads screens. Each resolves the signed-in kennel,
// parses input into explicit typed values (never spreading raw input),
// validates on the server, then calls lib/dashboard. The data layer checks
// again that the lead and everything it references belong to the kennel (a
// bound id is not tamper-proof). Actions that stay on the page call
// refresh(), so the page comes back updated in the same round trip.
import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import {
    addLeadNote,
    addToWaitlist,
    createLead,
    deleteLead,
    getLeadFormOptions,
    getLeadSummary,
    getReservablePuppies,
    getWaitlistOptions,
    LEAD_STAGES,
    LOST_REASONS,
    markFollowUpDone,
    markLeadLost,
    moveLeadStage,
    releasePuppy,
    removeFromWaitlist,
    reopenLead,
    reservePuppy,
    setFollowUp,
    updateLead,
} from "@/lib/dashboard/leads";
import { getViewerToday } from "@/lib/dashboard/viewerDate";
import { failed, fromResult } from "@/lib/dashboard/actionState";
import { LEAD_NOTE_MAX, parseLeadFormData, validateLeadInput, WAITLIST_NOTE_MAX, type LeadFieldErrors, type LeadFormValues } from "@/lib/dashboard/validation/lead";
import type { ActionState, BoardStage, FieldError, LostReason, SimpleMutationResult } from "@/lib/dashboard/types";

export type LeadFormState = {
    status: "idle" | "error";
    values: LeadFormValues;
    fieldErrors: LeadFieldErrors;
    formError?: FieldError;
    /** Increments on every submit; the form remounts its fields with it (see DogFormState). */
    submission?: number;
};


async function requireKennelId(): Promise<string> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    return kennel!.id;
}

const text = (formData: FormData, key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
};


// --- Add / edit -------------------------------------------------------------------

/** Add lead. On success redirects to the board with a notice. */
export async function createLeadAction(previous: LeadFormState, formData: FormData): Promise<LeadFormState> {
    const kennelId = await requireKennelId();
    const values = parseLeadFormData(formData);
    const submission = (previous.submission ?? 0) + 1;

    const [options, today] = await Promise.all([getLeadFormOptions(kennelId), getViewerToday()]);
    const validation = validateLeadInput(values, { ...options, today });
    if (!validation.ok) return { status: "error", values, fieldErrors: validation.fieldErrors, submission };

    const result = await createLead(kennelId, validation.input);
    if (!result.ok) return { status: "error", values, fieldErrors: result.fieldErrors, formError: result.formError, submission };

    redirect({ href: "/dashboard/leads?notice=created", locale: await getLocale() });
    return { status: "idle", values, fieldErrors: {}, submission };
}

/** Edit lead. The stage is not a form field: the lead keeps its own. Redirects back to the lead page. */
export async function updateLeadAction(leadId: string, previous: LeadFormState, formData: FormData): Promise<LeadFormState> {
    const kennelId = await requireKennelId();
    const values = parseLeadFormData(formData);
    const submission = (previous.submission ?? 0) + 1;

    const lead = await getLeadSummary(kennelId, leadId);
    if (!lead) return { status: "error", values, fieldErrors: {}, formError: { key: "notFound" }, submission };

    const [options, today] = await Promise.all([getLeadFormOptions(kennelId), getViewerToday()]);
    // A follow-up that's already in the past may be kept unchanged; a new date may not be in the past.
    const validation = validateLeadInput(values, { ...options, today, stage: lead.stage, unchangedFollowUp: lead.followUpAt });
    if (!validation.ok) return { status: "error", values, fieldErrors: validation.fieldErrors, submission };

    const result = await updateLead(kennelId, leadId, validation.input);
    if (!result.ok) return { status: "error", values, fieldErrors: result.fieldErrors, formError: result.formError, submission };

    redirect({ href: `/dashboard/leads/${encodeURIComponent(leadId)}?notice=saved`, locale: await getLocale() });
    return { status: "idle", values, fieldErrors: {}, submission };
}

// --- Stage, lost, delete ------------------------------------------------------------

/** Board move, or Change stage on the lead page. Only the six pipeline stages. */
export async function moveLeadStageAction(leadId: string, stage: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    if (!LEAD_STAGES.includes(stage as BoardStage)) return { ok: false, fieldErrors: { stage: { key: "invalidChoice" } } };
    const result = await moveLeadStage(kennelId, leadId, stage as BoardStage);
    if (result.ok) refresh();
    return result;
}

export async function markLostAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const reason = text(formData, "reason");
    if (!LOST_REASONS.includes(reason as LostReason)) return failed(previous, { reason: { key: reason ? "invalidChoice" : "required" } });
    return fromResult(previous, await markLeadLost(kennelId, leadId, { reason: reason as LostReason, releasePuppy: formData.get("releasePuppy") === "on" }));
}

/** Plain form action (Reopen button). */
export async function reopenLeadAction(leadId: string): Promise<void> {
    const kennelId = await requireKennelId();
    const result = await reopenLead(kennelId, leadId);
    if (result.ok) refresh();
}

export async function deleteLeadAction(leadId: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    const result = await deleteLead(kennelId, leadId);
    if (!result.ok) return result;
    redirect({ href: "/dashboard/leads?notice=deleted", locale: await getLocale() });
    return result;
}

// --- Notes and follow-up -------------------------------------------------------------

export async function addNoteAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const body = text(formData, "body");
    if (!body) return failed(previous, { body: { key: "required" } });
    if (body.length > LEAD_NOTE_MAX) return failed(previous, { body: { key: "tooLong", params: { max: LEAD_NOTE_MAX } } });
    return fromResult(previous, await addLeadNote(kennelId, leadId, body));
}

/** Reschedule / Set follow-up. The date is required here and can't be in the past (viewer's day). */
export async function setFollowUpAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const date = text(formData, "date");
    if (!date) return failed(previous, { date: { key: "required" } });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return failed(previous, { date: { key: "invalidDate" } });
    if (date < (await getViewerToday())) return failed(previous, { date: { key: "pastFollowUp" } });
    return fromResult(previous, await setFollowUp(kennelId, leadId, date));
}

export async function markFollowUpDoneAction(leadId: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    const result = await markFollowUpDone(kennelId, leadId);
    if (result.ok) refresh();
    return result;
}

// --- Puppy ---------------------------------------------------------------------------------

export async function reservePuppyAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const dogId = text(formData, "dogId");
    if (!dogId) return failed(previous, { dogId: { key: "choosePuppy" } });
    // Only puppies offered to this kennel; the data layer re-checks availability at write time.
    const offered = await getReservablePuppies(kennelId, leadId);
    if (!offered.some((puppy) => puppy.id === dogId)) {
        return failed(previous, {}, { key: "puppyNoLongerAvailable" });
    }
    return fromResult(previous, await reservePuppy(kennelId, leadId, dogId));
}

export async function releasePuppyAction(leadId: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    const result = await releasePuppy(kennelId, leadId);
    if (result.ok) refresh();
    return result;
}

// --- Waitlist ------------------------------------------------------------------------------

export async function addToWaitlistAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const litterId = text(formData, "litterId");
    const note = text(formData, "note");
    if (!litterId) return failed(previous, { litterId: { key: "required" } });
    const options = await getWaitlistOptions(kennelId, leadId);
    if (!options.some((option) => option.id === litterId)) return failed(previous, { litterId: { key: "invalidChoice" } });
    if (note.length > WAITLIST_NOTE_MAX) return failed(previous, { note: { key: "tooLong", params: { max: WAITLIST_NOTE_MAX } } });
    return fromResult(previous, await addToWaitlist(kennelId, leadId, litterId, note || null));
}

/** Plain form action (Remove button on a waitlist row). */
export async function removeFromWaitlistAction(entryId: string): Promise<void> {
    const kennelId = await requireKennelId();
    const result = await removeFromWaitlist(kennelId, entryId);
    if (result.ok) refresh();
}
