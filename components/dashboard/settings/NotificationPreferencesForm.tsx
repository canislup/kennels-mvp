"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { PreferencesFormState } from "@/app/[locale]/dashboard/settings/notifications/actions";
import type { NotificationPreference } from "@/lib/dashboard/types";
import Card from "@/components/dashboard/ui/Card";
import Notice from "@/components/dashboard/ui/Notice";
import SaveBar from "@/components/dashboard/ui/SaveBar";
import Toggle from "@/components/dashboard/ui/Toggle";

type SaveAction = (state: PreferencesFormState, formData: FormData) => Promise<PreferencesFormState>;

/** One switch per notification type, saved together with the sticky SaveBar (Dog-Edit pattern). */
export default function NotificationPreferencesForm({ action, initialValues }: { action: SaveAction; initialValues: NotificationPreference[] }) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState(action, { status: "idle", fieldErrors: {}, submission: 0, values: initialValues });
    const values = state.values ?? initialValues;

    return (
        <form action={formAction} noValidate>
            <Card as="section" aria-labelledby="notifications-heading">
                <h2 id="notifications-heading" className="mb-1 font-display text-xl font-bold">
                    {t("settings.notifications.heading")}
                </h2>
                <p className="mb-4 text-[13px] text-stone-500">{t("settings.notifications.sub")}</p>
                <Notice tone="info" dismissible={false} className="mb-2">
                    {t("settings.notifications.note")}
                </Notice>
                {state.formError && (
                    <Notice tone="error" dismissible={false} className="my-3">
                        {t(`common.errors.${state.formError.key}`, state.formError.params)}
                    </Notice>
                )}
                {/* Remounted after each save so the switches show what was saved. */}
                <ul key={state.submission} className="divide-y divide-line">
                    {values.map((pref) => (
                        <li key={pref.type} className="py-3.5">
                            <Toggle
                                name={pref.type}
                                defaultChecked={pref.emailEnabled}
                                label={t(`settings.notifications.types.${pref.type}.title`)}
                                description={t(`settings.notifications.types.${pref.type}.help`)}
                                stateLabels={{ on: t("settings.notifications.on"), off: t("settings.notifications.off") }}
                            />
                        </li>
                    ))}
                </ul>
            </Card>
            <SaveBar cancelHref="/dashboard/settings/notifications" submitLabel={t("settings.notifications.save")} pending={pending} saved={state.status === "done"} resetKey={state.savedAt} />
        </form>
    );
}
