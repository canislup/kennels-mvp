"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { changePasswordAction } from "@/app/[locale]/dashboard/settings/account/actions";
import { ACCOUNT_LIMITS } from "@/lib/dashboard/validation/account";
import Button from "@/components/dashboard/ui/Button";
import Card from "@/components/dashboard/ui/Card";
import Field from "@/components/dashboard/ui/Field";
import Notice from "@/components/dashboard/ui/Notice";
import TextInput from "@/components/dashboard/ui/TextInput";
import { useFocusFirstError } from "@/components/dashboard/ui/useFocusFirstError";

/**
 * Change password. The action never sends password values back, and the
 * fields remount empty after every result (`key={submission}`).
 */
export default function PasswordForm({ email }: { email: string }) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState(changePasswordAction, { status: "idle", fieldErrors: {}, submission: 0 });
    const formRef = useRef<HTMLFormElement>(null);
    useFocusFirstError(formRef, state);
    const error = (field: string) => {
        const fieldError = state.fieldErrors[field];
        return fieldError ? t(`common.errors.${fieldError.key}`, fieldError.params) : undefined;
    };

    return (
        <Card as="section" aria-labelledby="password-heading">
            <h2 id="password-heading" className="mb-1 font-display text-xl font-bold">
                {t("settings.account.password.heading")}
            </h2>
            <p className="mb-5 text-[13px] text-stone-500">{t("settings.account.password.sub")}</p>
            {state.status === "done" && (
                <Notice key={state.submission} tone="success" className="mb-5">
                    {t("settings.account.password.updated")}
                </Notice>
            )}
            <form ref={formRef} action={formAction} noValidate>
                {/* Lets password managers attach the new password to the right account. */}
                <input type="text" name="username" autoComplete="username" defaultValue={email} readOnly hidden />
                <div key={state.submission} className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4.5">
                    <Field id="password-current" label={t("settings.account.password.current")} error={error("currentPassword")}>
                        {(control) => <TextInput {...control} name="currentPassword" type="password" autoComplete="current-password" />}
                    </Field>
                    <Field id="password-new" label={t("settings.account.password.new")} help={t("settings.account.password.newHelp", { min: ACCOUNT_LIMITS.passwordMin })} error={error("newPassword")}>
                        {(control) => <TextInput {...control} name="newPassword" type="password" autoComplete="new-password" />}
                    </Field>
                    <Field id="password-confirm" label={t("settings.account.password.confirm")} error={error("confirmPassword")}>
                        {(control) => <TextInput {...control} name="confirmPassword" type="password" autoComplete="new-password" />}
                    </Field>
                </div>
                <div className="mt-5.5 flex justify-end">
                    <Button type="submit" disabled={pending} aria-busy={pending}>
                        {pending ? t("settings.account.password.pending") : t("settings.account.password.submit")}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
