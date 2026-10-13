"use server";

// Server Actions for Reviews. Each resolves the signed-in kennel and validates
// on the server; the data layer checks again that the review belongs to it.
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { createReviewInvite, postReviewReply, reportReview } from "@/lib/dashboard/reviews";
import { validateInviteEmail, validateReply, validateReport } from "@/lib/dashboard/validation/review";
import { textField } from "@/lib/dashboard/validation/common";
import { failed, fromResult } from "@/lib/dashboard/actionState";
import type { ActionState } from "@/lib/dashboard/types";

export type ReplyFormState = ActionState & { values?: { body: string } };

export type InviteFormState = ActionState & {
    values?: { email: string };
    /** The invite just created: its link and the email it was meant for (null = link only). */
    invite?: { url: string; email: string | null };
};

async function requireKennelId(): Promise<string> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    return kennel!.id;
}

/** Post or edit the public reply. Bound with the review id on the server. */
export async function replyToReviewAction(reviewId: string, previous: ReplyFormState, formData: FormData): Promise<ReplyFormState> {
    const kennelId = await requireKennelId();
    const validation = validateReply(formData);
    if (!validation.ok) return { ...failed(previous, validation.fieldErrors), values: validation.values };
    const state = fromResult(previous, await postReviewReply(kennelId, reviewId, validation.body));
    return state.status === "error" ? { ...state, values: { body: validation.body } } : state;
}

/** Report a review for moderation (FormModal). */
export async function reportReviewAction(reviewId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const validation = validateReport(formData);
    if (!validation.ok) return failed(previous, validation.fieldErrors);
    return fromResult(previous, await reportReview(kennelId, reviewId, validation.input));
}

/**
 * "Send" (intent=send, with the optional email) or "Copy invite link instead"
 * (intent=link, ignores the email). No email is sent in this version.
 */
export async function createInviteAction(previous: InviteFormState, formData: FormData): Promise<InviteFormState> {
    const kennelId = await requireKennelId();
    const linkOnly = textField(formData, "intent") === "link";
    const email = textField(formData, "email").toLowerCase();
    if (!linkOnly) {
        const error = validateInviteEmail(email);
        if (error) return { ...failed(previous, { email: error }), values: { email } };
    }
    const result = await createReviewInvite(kennelId, { email: linkOnly ? null : email || null, locale: await getLocale() });
    if (!result.ok) return { ...failed(previous, result.fieldErrors as ActionState["fieldErrors"], result.formError), values: { email } };
    return { status: "done", fieldErrors: {}, submission: previous.submission + 1, values: { email: "" }, invite: { url: result.url, email: linkOnly ? null : email || null } };
}
