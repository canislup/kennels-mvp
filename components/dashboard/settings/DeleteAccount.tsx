"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { deleteAccountAction } from "@/app/[locale]/dashboard/settings/account/actions";
import Button from "@/components/dashboard/ui/Button";
import Card from "@/components/dashboard/ui/Card";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import Field from "@/components/dashboard/ui/Field";
import Notice from "@/components/dashboard/ui/Notice";
import TextInput from "@/components/dashboard/ui/TextInput";

/**
 * Danger zone. "Delete account" stays disabled until the typed text equals the
 * kennel name exactly; a ConfirmDialog asks once more, then the form submits
 * and the server checks the name again. The mock deletes nothing and says so.
 */
export default function DeleteAccount({ kennelName }: { kennelName: string }) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState(deleteAccountAction, { status: "idle", fieldErrors: {}, submission: 0 });
    const [matches, setMatches] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const fieldError = state.fieldErrors.confirmName;

    // Once the server has answered: close the dialog. React also clears the field after the action, so it no longer matches.
    const [seen, setSeen] = useState(state.submission);
    if (seen !== state.submission) {
        setSeen(state.submission);
        setConfirming(false);
        setMatches(false);
    }

    return (
        <Card as="section" aria-labelledby="danger-heading">
            <h2 id="danger-heading" className="mb-1 font-display text-xl font-bold text-status-red">
                {t("settings.account.danger.heading")}
            </h2>
            <p className="mb-5 text-[13px] text-stone-500">{t("settings.account.danger.description")}</p>
            {state.status === "done" && (
                <Notice tone="warning" dismissible={false} className="mb-5">
                    {t("settings.account.danger.previewNotice")}
                </Notice>
            )}
            {state.formError && (
                <Notice tone="error" dismissible={false} className="mb-5">
                    {t(`common.errors.${state.formError.key}`, state.formError.params)}
                </Notice>
            )}
            <form ref={formRef} action={formAction} noValidate className="flex flex-wrap items-start gap-x-3.5 gap-y-3">
                <Field
                    id="delete-confirm"
                    label={t("settings.account.danger.confirmLabel")}
                    help={t("settings.account.danger.confirmHelp", { name: kennelName })}
                    error={fieldError ? t(`common.errors.${fieldError.key}`, fieldError.params) : undefined}
                    className="flex-[1_1_260px]"
                >
                    {(control) => (
                        <TextInput
                            {...control}
                            name="confirmName"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={kennelName}
                            onInput={(event) => setMatches(event.currentTarget.value === kennelName)}
                        />
                    )}
                </Field>
                {/* mt = the label's height, so the button lines up with the input from sm up. */}
                <Button variant="danger" disabled={!matches || pending} onClick={() => setConfirming(true)} className="sm:mt-6.5">
                    {t("settings.account.danger.button")}
                </Button>
            </form>
            <ConfirmDialog
                open={confirming}
                tone="danger"
                title={t("settings.account.danger.dialogTitle", { name: kennelName })}
                description={t("settings.account.danger.dialogDescription")}
                confirmLabel={pending ? t("settings.account.danger.pending") : t("settings.account.danger.dialogConfirm")}
                cancelLabel={t("settings.common.cancel")}
                pending={pending}
                onConfirm={() => formRef.current?.requestSubmit()}
                onCancel={() => setConfirming(false)}
            />
        </Card>
    );
}
