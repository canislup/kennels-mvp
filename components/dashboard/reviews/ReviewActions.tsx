"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReplyFormState } from "@/app/[locale]/dashboard/reviews/actions";
import type { ActionState, ReviewReply } from "@/lib/dashboard/types";
import { REPORT_REASONS, REVIEW_LIMITS } from "@/lib/dashboard/validation/review";
import Button from "@/components/dashboard/ui/Button";
import Field from "@/components/dashboard/ui/Field";
import FormModal from "@/components/dashboard/ui/FormModal";
import Select from "@/components/dashboard/ui/Select";
import Textarea from "@/components/dashboard/ui/Textarea";
import { useFocusFirstError } from "@/components/dashboard/ui/useFocusFirstError";

type ReplyAction = (state: ReplyFormState, formData: FormData) => Promise<ReplyFormState>;
type ReportAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const LINK_BUTTON =
    "rounded text-[13px] font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * The bottom of a review card: the public reply (with Edit reply), the inline
 * reply form, or the Reply / Report buttons. The form opens in place; focus
 * moves into it, and back to the button that opened it on Cancel or after
 * saving. Both actions arrive bound to the review id from the server.
 */
export default function ReviewActions({
    reviewId,
    reviewerFirstName,
    reply,
    reported,
    replyAction,
    reportAction,
}: {
    reviewId: string;
    reviewerFirstName: string;
    reply: ReviewReply | null;
    reported: boolean;
    replyAction: ReplyAction;
    reportAction: ReportAction;
}) {
    const t = useTranslations("dashboard.reviews");
    const [editing, setEditing] = useState(false);
    const [announcement, setAnnouncement] = useState("");
    const triggerRef = useRef<HTMLButtonElement>(null);
    const restoreFocus = useRef(false);

    // After the form closes, focus the button that opens it again (Reply or Edit reply).
    useEffect(() => {
        if (editing || !restoreFocus.current) return;
        restoreFocus.current = false;
        triggerRef.current?.focus();
    }, [editing, reply]);

    // `wasEdit` comes from the form: by the time it closes, the refreshed props already hold the new reply.
    function close(saved: boolean, wasEdit: boolean) {
        restoreFocus.current = true;
        if (saved) setAnnouncement(wasEdit ? t("replyForm.updated") : t("replyForm.posted"));
        setEditing(false);
    }

    return (
        <div>
            {reply && !editing && (
                <div className="rounded-r-xl border-l-3 border-accent bg-stone-50 px-4 py-3.5">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-accent">
                            {t("card.yourReply")}
                            {reply.updatedAt !== reply.createdAt && <span className="font-normal text-stone-500"> · {t("card.edited")}</span>}
                        </span>
                        <button
                            ref={triggerRef}
                            type="button"
                            onClick={() => setEditing(true)}
                            aria-label={t("card.editReplyLabel", { name: reviewerFirstName })}
                            className={LINK_BUTTON}
                        >
                            {t("card.editReply")}
                        </button>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-line text-stone-700">{reply.body}</p>
                </div>
            )}

            {editing && <ReplyForm id={`reply-${reviewId}`} action={replyAction} defaultBody={reply?.body ?? ""} firstName={reviewerFirstName} isEdit={reply !== null} onClose={close} />}

            {!reply && !editing && (
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={() => setEditing(true)}
                        aria-label={t("card.replyLabel", { name: reviewerFirstName })}
                        className="rounded-xl border border-accent-soft bg-accent-soft px-4 py-2 text-[13px] font-semibold text-accent transition-colors hover:border-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {t("card.reply")}
                    </button>
                    {!reported && <ReportReview action={reportAction} firstName={reviewerFirstName} />}
                </div>
            )}
            {reply && !editing && !reported && (
                <div className="mt-3">
                    <ReportReview action={reportAction} firstName={reviewerFirstName} />
                </div>
            )}

            <p role="status" aria-live="polite" className="sr-only">
                {announcement}
            </p>
        </div>
    );
}

function ReplyForm({
    id,
    action,
    defaultBody,
    firstName,
    isEdit: isEditProp,
    onClose,
}: {
    id: string;
    action: ReplyAction;
    defaultBody: string;
    firstName: string;
    isEdit: boolean;
    onClose: (saved: boolean, wasEdit: boolean) => void;
}) {
    const t = useTranslations("dashboard");
    // Fixed when the form opens: after a save, the refresh re-renders it with the new reply before it closes.
    const [isEdit] = useState(isEditProp);
    const [state, formAction, pending] = useActionState(action, { status: "idle", fieldErrors: {}, submission: 0 });
    const formRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useFocusFirstError(formRef, state);

    // Focus moves into the form when it opens.
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // The action has refreshed the page with the saved reply: close.
    useEffect(() => {
        if (state.status === "done") onClose(true, isEdit);
    }, [state, onClose, isEdit]);

    const error = state.fieldErrors.body;
    const message = (key: string, params?: Record<string, string | number>) => t(`common.errors.${key}`, params);

    return (
        <form ref={formRef} action={formAction} noValidate>
            {state.formError && (
                <p data-error-focus tabIndex={-1} className="mb-2 text-[13px] font-medium text-status-red">
                    {message(state.formError.key, state.formError.params)}
                </p>
            )}
            <Field id={id} label={isEdit ? t("reviews.replyForm.editLabel") : t("reviews.replyForm.label")} error={error ? message(error.key, error.params) : undefined}>
                {(control) => (
                    <Textarea
                        {...control}
                        key={state.submission}
                        ref={textareaRef}
                        name="body"
                        rows={3}
                        maxLength={REVIEW_LIMITS.reply}
                        defaultValue={state.values?.body ?? defaultBody}
                        placeholder={t("reviews.replyForm.placeholder", { name: firstName })}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                event.preventDefault();
                                onClose(false, isEdit);
                            }
                        }}
                    />
                )}
            </Field>
            <div className="mt-1 flex justify-end gap-2.5">
                <Button variant="secondary" onClick={() => onClose(false, isEdit)} disabled={pending} className="px-4 py-2 text-[13px]">
                    {t("reviews.replyForm.cancel")}
                </Button>
                <Button type="submit" disabled={pending} aria-busy={pending} className="px-4.5 py-2 text-[13px]">
                    {pending ? t("reviews.replyForm.posting") : isEdit ? t("reviews.replyForm.save") : t("reviews.replyForm.post")}
                </Button>
            </div>
        </form>
    );
}

function ReportReview({ action, firstName }: { action: ReportAction; firstName: string }) {
    const t = useTranslations("dashboard.reviews.report");
    return (
        <FormModal
            title={t("title")}
            description={t("description")}
            action={action}
            submitLabel={t("submit")}
            pendingLabel={t("pending")}
            cancelLabel={t("cancel")}
            tone="danger"
            trigger={(open) => (
                <button
                    type="button"
                    onClick={open}
                    aria-label={t("triggerLabel", { name: firstName })}
                    className="rounded text-[13px] text-stone-500 hover:text-stone-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    {t("trigger")}
                </button>
            )}
        >
            {({ error }) => (
                <div className="flex flex-col gap-4">
                    <Field id="report-reason" label={t("reason")} error={error("reason")}>
                        {(control) => (
                            <Select {...control} name="reason" defaultValue="">
                                <option value="">{t("choose")}</option>
                                {REPORT_REASONS.map((reason) => (
                                    <option key={reason} value={reason}>
                                        {t(`reasons.${reason}`)}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </Field>
                    <Field id="report-details" label={t("details")} error={error("details")}>
                        {(control) => <Textarea {...control} name="details" rows={3} maxLength={REVIEW_LIMITS.reportDetails} />}
                    </Field>
                </div>
            )}
        </FormModal>
    );
}
