"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { deleteLeadAction, markLostAction, reservePuppyAction } from "@/app/[locale]/dashboard/leads/actions";
import type { ReservablePuppy } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import FormModal from "@/components/dashboard/ui/FormModal";
import Select from "@/components/dashboard/ui/Select";
import StatusMenu from "@/components/dashboard/ui/StatusMenu";
import { LOST_REASON_ORDER } from "../leadMeta";

/** Summary-card actions: Send message, Reserve a puppy, and the More menu (Edit, Mark as lost, Delete). */
export default function LeadHeaderActions({
    leadId,
    leadName,
    isLost,
    heldDogName,
    reservable,
}: {
    leadId: string;
    leadName: string;
    isLost: boolean;
    /** The puppy reserved for this lead, if any. */
    heldDogName: string | null;
    reservable: ReservablePuppy[];
}) {
    const t = useTranslations("dashboard");
    const router = useRouter();
    const [dialog, setDialog] = useState<"lost" | "delete" | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleting, startDelete] = useTransition();

    const actions = [
        { value: "edit", label: t("leads.detail.more.edit") },
        ...(isLost ? [] : [{ value: "lost", label: t("leads.detail.more.lost") }]),
        { value: "delete", label: t("leads.detail.more.delete") },
    ];

    function onAction(value: string) {
        if (value === "edit") router.push(`/dashboard/leads/${leadId}/edit`);
        else setDialog(value as "lost" | "delete");
    }

    function confirmDelete() {
        startDelete(async () => {
            const result = await deleteLeadAction(leadId); // redirects to the board on success
            if (!result.ok) setDeleteError(t(`common.errors.${result.formError?.key ?? "generic"}`, result.formError?.params));
        });
    }

    return (
        <div className="flex flex-wrap items-center gap-2.5">
            <Button href={`/dashboard/messages?lead=${encodeURIComponent(leadId)}`}>{t("leads.detail.sendMessage")}</Button>

            {!isLost && !heldDogName && (
                <FormModal
                    title={t("leads.detail.reserve.title", { name: leadName })}
                    description={reservable.length > 0 ? t("leads.detail.reserve.description") : t("leads.detail.reserve.none")}
                    action={reservePuppyAction.bind(null, leadId)}
                    submitLabel={t("leads.detail.reserve.submit")}
                    pendingLabel={t("leads.detail.reserve.pending")}
                    cancelLabel={t("leads.detail.cancel")}
                    submitDisabled={reservable.length === 0}
                    trigger={(open) => (
                        <Button variant="secondary" onClick={open}>
                            {t("leads.detail.reserve.button")}
                        </Button>
                    )}
                >
                    {({ error }) =>
                        reservable.length > 0 && (
                            <fieldset aria-describedby={error("dogId") ? "reserve-error" : undefined}>
                                <legend className="sr-only">{t("leads.detail.reserve.pick")}</legend>
                                <ul
                                    role="radiogroup"
                                    aria-label={t("leads.detail.reserve.pick")}
                                    aria-invalid={error("dogId") ? true : undefined}
                                    className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line"
                                >
                                    {reservable.map((puppy, index) => (
                                        <li key={puppy.id}>
                                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-stone-50 has-checked:bg-accent-soft">
                                                <input type="radio" name="dogId" value={puppy.id} className="size-4 accent-accent" data-error-focus={index === 0 && error("dogId") ? "" : undefined} />
                                                <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-linear-135 from-sand-light to-sand-dark">
                                                    {puppy.coverPhotoUrl && <img src={puppy.coverPhotoUrl} alt="" className="h-full w-full object-cover" />}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-stone-900">{puppy.name}</span>
                                                    <span className="block truncate text-xs text-stone-500">
                                                        {[t(`common.sex.${puppy.sex}`), puppy.breed, puppy.litterName].filter(Boolean).join(" · ")}
                                                    </span>
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                                {error("dogId") && (
                                    <p id="reserve-error" className="mt-2 text-xs font-medium text-status-red">
                                        {error("dogId")}
                                    </p>
                                )}
                            </fieldset>
                        )
                    }
                </FormModal>
            )}

            <StatusMenu
                variant="icon"
                kind="actions"
                icon={<MoreHorizontal className="size-4.5" aria-hidden />}
                value=""
                options={actions}
                onSelect={onAction}
                triggerLabels={{ "": t("leads.detail.more.label", { name: leadName }) }}
                menuLabel={t("leads.detail.more.menu", { name: leadName })}
                failedMessage=""
            />

            <FormModal
                open={dialog === "lost"}
                onOpenChange={(open) => setDialog(open ? "lost" : null)}
                title={t("leads.detail.lost.title", { name: leadName })}
                description={t("leads.detail.lost.description")}
                action={markLostAction.bind(null, leadId)}
                submitLabel={t("leads.detail.lost.submit")}
                pendingLabel={t("leads.detail.lost.pending")}
                cancelLabel={t("leads.detail.cancel")}
            >
                {({ error }) => (
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="lost-reason" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                                {t("leads.detail.lost.reason")}
                            </label>
                            <Select
                                id="lost-reason"
                                name="reason"
                                defaultValue=""
                                aria-invalid={error("reason") ? true : undefined}
                                aria-describedby={error("reason") ? "lost-reason-error" : undefined}
                            >
                                <option value="">{t("leads.detail.lost.choose")}</option>
                                {LOST_REASON_ORDER.map((reason) => (
                                    <option key={reason} value={reason}>
                                        {t(`leads.lostReasons.${reason}`)}
                                    </option>
                                ))}
                            </Select>
                            {error("reason") && (
                                <p id="lost-reason-error" className="mt-1.5 text-xs font-medium text-status-red">
                                    {error("reason")}
                                </p>
                            )}
                        </div>
                        {heldDogName && (
                            <label className="flex items-start gap-2.5 text-sm text-stone-700">
                                <input type="checkbox" name="releasePuppy" defaultChecked className="mt-0.5 size-4 accent-accent" />
                                {t("leads.detail.lost.release", { dog: heldDogName })}
                            </label>
                        )}
                    </div>
                )}
            </FormModal>

            <ConfirmDialog
                open={dialog === "delete"}
                tone="danger"
                title={t("leads.detail.delete.title", { name: leadName })}
                description={t("leads.detail.delete.description", { name: leadName })}
                confirmLabel={deleting ? t("leads.detail.delete.pending") : t("leads.detail.delete.confirm")}
                cancelLabel={t("leads.detail.cancel")}
                pending={deleting}
                error={deleteError}
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDialog(null);
                    setDeleteError(null);
                }}
            />
        </div>
    );
}
