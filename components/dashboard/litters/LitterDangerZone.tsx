"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteLitterAction } from "@/app/[locale]/dashboard/litters/actions";
import Button from "@/components/dashboard/ui/Button";
import Card from "@/components/dashboard/ui/Card";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";

/** "Delete litter" card (edit page only). Puppies are kept and just unlinked. */
export default function LitterDangerZone({ litterId, litterName, puppyCount }: { litterId: string; litterName: string; puppyCount: number }) {
    const t = useTranslations("dashboard.litters.form.danger");
    const tErrors = useTranslations("dashboard.common.errors");
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function confirm() {
        startTransition(async () => {
            const result = await deleteLitterAction(litterId); // redirects on success
            if (!result.ok) setError(tErrors(result.formError?.key ?? "generic"));
        });
    }

    return (
        <Card as="section" aria-labelledby="litter-danger">
            <h2 id="litter-danger" className="mb-2 font-display text-xl font-bold text-status-red">
                {t("heading")}
            </h2>
            <p className="mb-4 text-[13px] text-stone-600">{t("description")}</p>
            <Button variant="danger" onClick={() => setOpen(true)}>
                {t("delete")}
            </Button>
            <ConfirmDialog
                open={open}
                tone="danger"
                title={t("confirmTitle", { name: litterName })}
                description={t("confirmDescription", { name: litterName, count: puppyCount })}
                confirmLabel={pending ? t("working") : t("confirm")}
                cancelLabel={t("cancel")}
                pending={pending}
                error={error}
                onConfirm={confirm}
                onCancel={() => {
                    setOpen(false);
                    setError(null);
                }}
            />
        </Card>
    );
}
