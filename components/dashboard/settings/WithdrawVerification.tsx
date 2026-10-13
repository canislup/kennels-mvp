"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { withdrawVerificationAction } from "@/app/[locale]/dashboard/settings/verification/actions";
import Button from "@/components/dashboard/ui/Button";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";

/** "Withdraw request" with a confirmation. On success the action redirects with a notice. */
export default function WithdrawVerification() {
    const t = useTranslations("dashboard");
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function confirm() {
        startTransition(async () => {
            const result = await withdrawVerificationAction();
            if (!result.ok) setError(t(`common.errors.${result.formError?.key ?? "generic"}`));
        });
    }

    return (
        <>
            <Button variant="secondary" onClick={() => setOpen(true)}>
                {t("settings.verification.withdraw")}
            </Button>
            <ConfirmDialog
                open={open}
                title={t("settings.verification.withdrawTitle")}
                description={t("settings.verification.withdrawDescription")}
                confirmLabel={pending ? t("settings.verification.withdrawing") : t("settings.verification.withdrawConfirm")}
                cancelLabel={t("settings.common.cancel")}
                pending={pending}
                error={error}
                onConfirm={confirm}
                onCancel={() => {
                    setOpen(false);
                    setError(null);
                }}
            />
        </>
    );
}
