"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { markFollowUpDoneAction, setFollowUpAction } from "@/app/[locale]/dashboard/leads/actions";
import Button from "@/components/dashboard/ui/Button";
import FormModal from "@/components/dashboard/ui/FormModal";
import TextInput from "@/components/dashboard/ui/TextInput";

/** Mark done (immediate) and Reschedule / Set follow-up (a date in a dialog). */
export default function FollowUpActions({
    leadId,
    followUpAt,
    today,
    headingId,
    canSchedule = true,
}: {
    leadId: string;
    followUpAt: string | null;
    today: string;
    headingId: string;
    /** false for a lost lead: no Set follow-up / Reschedule (reopen the lead first). */
    canSchedule?: boolean;
}) {
    const t = useTranslations("dashboard.leads.detail.followUp");
    const tCommon = useTranslations("dashboard.leads.detail");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function markDone() {
        startTransition(async () => {
            const result = await markFollowUpDoneAction(leadId);
            if (result.ok) {
                setError(null);
                // The button goes away with the follow-up: keep focus in the card.
                document.getElementById(headingId)?.focus();
            } else setError(t("failed"));
        });
    }

    return (
        <>
            <div className="flex gap-2">
                {followUpAt && (
                    <Button variant="secondary" className="flex-1 px-3 py-2.25 text-[13px]" onClick={markDone} disabled={pending} aria-busy={pending}>
                        {pending ? t("marking") : t("markDone")}
                    </Button>
                )}
                {canSchedule && <FormModal
                    title={followUpAt ? t("rescheduleTitle") : t("setTitle")}
                    description={t("dialogDescription")}
                    action={setFollowUpAction.bind(null, leadId)}
                    submitLabel={t("save")}
                    pendingLabel={t("saving")}
                    cancelLabel={tCommon("cancel")}
                    trigger={(open) => (
                        <Button variant="secondary" className="flex-1 px-3 py-2.25 text-[13px]" onClick={open}>
                            {followUpAt ? t("reschedule") : t("set")}
                        </Button>
                    )}
                >
                    {({ error: fieldError }) => (
                        <div>
                            <label htmlFor="follow-up-date" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                                {t("dateLabel")}
                            </label>
                            <TextInput
                                id="follow-up-date"
                                type="date"
                                name="date"
                                min={today}
                                defaultValue={followUpAt && followUpAt >= today ? followUpAt : ""}
                                aria-invalid={fieldError("date") ? true : undefined}
                                aria-describedby={fieldError("date") ? "follow-up-date-error" : undefined}
                            />
                            {fieldError("date") && (
                                <p id="follow-up-date-error" className="mt-1.5 text-xs font-medium text-status-red">
                                    {fieldError("date")}
                                </p>
                            )}
                        </div>
                    )}
                </FormModal>}
            </div>
            {!canSchedule && <p className="text-xs text-stone-500">{t("lostHint")}</p>}
            {error && (
                <p role="alert" className="mt-2 text-xs font-medium text-status-red">
                    {error}
                </p>
            )}
        </>
    );
}
