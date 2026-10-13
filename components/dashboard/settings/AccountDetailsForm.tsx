"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import type { AccountFormState } from "@/app/[locale]/dashboard/settings/account/actions";
import type { Account } from "@/lib/dashboard/types";
import { APP_LOCALES } from "@/lib/dashboard/validation/account";
import Button from "@/components/dashboard/ui/Button";
import Card from "@/components/dashboard/ui/Card";
import Field from "@/components/dashboard/ui/Field";
import Select from "@/components/dashboard/ui/Select";
import TextInput from "@/components/dashboard/ui/TextInput";
import { useFocusFirstError } from "@/components/dashboard/ui/useFocusFirstError";

type SaveAction = (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;

/** Name, email and language. A changed language makes the action redirect to the new locale. */
export default function AccountDetailsForm({ action, initialValues }: { action: SaveAction; initialValues: Account }) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState(action, { status: "idle", fieldErrors: {}, submission: 0, values: initialValues });
    const formRef = useRef<HTMLFormElement>(null);
    useFocusFirstError(formRef, state);
    const values = state.values ?? initialValues;
    const error = (field: string) => {
        const fieldError = state.fieldErrors[field];
        return fieldError ? t(`common.errors.${fieldError.key}`, fieldError.params) : undefined;
    };

    return (
        <Card as="section" aria-labelledby="account-details-heading">
            <h2 id="account-details-heading" className="mb-1 font-display text-xl font-bold">
                {t("settings.account.details.heading")}
            </h2>
            <p className="mb-5 text-[13px] text-stone-500">{t("settings.account.details.sub")}</p>
            <form ref={formRef} action={formAction} noValidate>
                {/* Remounted after each submit so the fields show the submitted values (and the select its defaultValue). */}
                <div key={state.submission} className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
                    <Field id="account-name" label={t("settings.account.details.fullName")} error={error("fullName")}>
                        {(control) => <TextInput {...control} name="fullName" defaultValue={values.fullName} autoComplete="name" required />}
                    </Field>
                    <Field id="account-email" label={t("settings.account.details.email")} error={error("email")}>
                        {(control) => <TextInput {...control} name="email" type="email" defaultValue={values.email} autoComplete="email" required />}
                    </Field>
                    <Field id="account-locale" label={t("settings.account.details.language")} error={error("locale")}>
                        {(control) => (
                            <Select {...control} name="locale" defaultValue={values.locale}>
                                {APP_LOCALES.map((locale) => (
                                    <option key={locale} value={locale} lang={locale}>
                                        {t(`settings.account.details.languages.${locale}`)}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </Field>
                </div>
                <div className="mt-5.5 flex flex-wrap items-center justify-end gap-3">
                    <p role="status" aria-live="polite" className="text-[13px] font-medium text-status-green">
                        {state.status === "done" && (
                            <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="size-4" aria-hidden />
                                {t("settings.account.details.saved")}
                            </span>
                        )}
                    </p>
                    <Button type="submit" disabled={pending} aria-busy={pending}>
                        {pending ? t("settings.common.saving") : t("settings.account.details.save")}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
