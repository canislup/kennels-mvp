// REAL LOGIC: keep when the backend lands. Server-side rules for review
// replies, reports and invites. Errors are translation keys
// (dashboard.common.errors.*) + params.
import type { FieldError, ReviewReportReason } from "../types";
import { EMAIL_MAX, EMAIL_PATTERN, textField } from "./common";

export const REVIEW_LIMITS = { reply: 1000, reportDetails: 500 } as const;

export const REPORT_REASONS: readonly ReviewReportReason[] = ["INAPPROPRIATE", "NOT_A_BUYER", "SPAM", "OTHER"];

/** The public reply: 1 to 1000 characters after trimming. */
export function validateReply(formData: FormData): { ok: true; body: string } | { ok: false; values: { body: string }; fieldErrors: Record<string, FieldError> } {
    const body = textField(formData, "body");
    if (!body) return { ok: false, values: { body }, fieldErrors: { body: { key: "replyRequired" } } };
    if (body.length > REVIEW_LIMITS.reply) return { ok: false, values: { body }, fieldErrors: { body: { key: "tooLong", params: { max: REVIEW_LIMITS.reply } } } };
    return { ok: true, body };
}

export function validateReport(formData: FormData): { ok: true; input: { reason: ReviewReportReason; details: string | null } } | { ok: false; fieldErrors: Record<string, FieldError> } {
    const reason = textField(formData, "reason");
    const details = textField(formData, "details");
    const fieldErrors: Record<string, FieldError> = {};
    if (!REPORT_REASONS.includes(reason as ReviewReportReason)) fieldErrors.reason = { key: reason ? "invalidChoice" : "chooseReason" };
    if (details.length > REVIEW_LIMITS.reportDetails) fieldErrors.details = { key: "tooLong", params: { max: REVIEW_LIMITS.reportDetails } };
    if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
    return { ok: true, input: { reason: reason as ReviewReportReason, details: details || null } };
}

/** Optional buyer email for an invite. Empty is fine (link-only invite). */
export function validateInviteEmail(email: string): FieldError | undefined {
    if (!email) return undefined;
    if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) return { key: "invalidEmail" };
    return undefined;
}
