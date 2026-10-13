"use client";

import { useTranslations } from "next-intl";
import { addToWaitlistAction } from "@/app/[locale]/dashboard/leads/actions";
import type { WaitlistOption } from "@/lib/dashboard/types";
import { WAITLIST_NOTE_MAX } from "@/lib/dashboard/validation/lead";
import Button from "@/components/dashboard/ui/Button";
import FormModal from "@/components/dashboard/ui/FormModal";
import Select from "@/components/dashboard/ui/Select";
import TextInput from "@/components/dashboard/ui/TextInput";

/** "Add to waitlist": a litter (planned, available or reserved, not joined yet) and an optional note. */
export default function WaitlistAdd({ leadId, leadName, options }: { leadId: string; leadName: string; options: WaitlistOption[] }) {
    const t = useTranslations("dashboard.leads.detail.waitlist");
    const tDetail = useTranslations("dashboard.leads.detail");
    const tLitters = useTranslations("dashboard.litters.status");

    if (options.length === 0) {
        return (
            <>
                <Button variant="secondary" className="mt-3.5 w-full" disabled aria-describedby="waitlist-none">
                    {t("add")}
                </Button>
                <p id="waitlist-none" className="mt-2 text-xs text-stone-500">
                    {t("noOptions")}
                </p>
            </>
        );
    }

    return (
        <FormModal
            title={t("addTitle", { name: leadName })}
            action={addToWaitlistAction.bind(null, leadId)}
            submitLabel={t("addSubmit")}
            pendingLabel={t("adding")}
            cancelLabel={tDetail("cancel")}
            trigger={(open) => (
                <Button variant="secondary" className="mt-3.5 w-full" onClick={open}>
                    {t("add")}
                </Button>
            )}
        >
            {({ error }) => (
                <div className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="waitlist-litter" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                            {t("litter")}
                        </label>
                        <Select id="waitlist-litter" name="litterId" defaultValue="" aria-invalid={error("litterId") ? true : undefined} aria-describedby={error("litterId") ? "waitlist-litter-error" : undefined}>
                            <option value="">{t("chooseLitter")}</option>
                            {options.map((litter) => (
                                <option key={litter.id} value={litter.id}>
                                    {`${litter.name} · ${litter.breed} (${tLitters(litter.status)})`}
                                </option>
                            ))}
                        </Select>
                        {error("litterId") && (
                            <p id="waitlist-litter-error" className="mt-1.5 text-xs font-medium text-status-red">
                                {error("litterId")}
                            </p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="waitlist-note" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                            {t("note")}
                        </label>
                        <TextInput
                            id="waitlist-note"
                            name="note"
                            maxLength={WAITLIST_NOTE_MAX}
                            placeholder={t("notePlaceholder")}
                            aria-invalid={error("note") ? true : undefined}
                            aria-describedby={error("note") ? "waitlist-note-error" : undefined}
                        />
                        {error("note") && (
                            <p id="waitlist-note-error" className="mt-1.5 text-xs font-medium text-status-red">
                                {error("note")}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </FormModal>
    );
}
