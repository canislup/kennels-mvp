"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { archiveDogAction, deleteDogAction } from "@/app/[locale]/dashboard/dogs/actions";
import Button from "@/components/dashboard/ui/Button";
import Card from "@/components/dashboard/ui/Card";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";

/** "Archive or delete" card with confirmation dialogs (edit page only). */
export default function DangerZone({ dogId, dogName, archived }: { dogId: string; dogName: string; archived: boolean }) {
    const t = useTranslations("dashboard.dogs.form.danger");
    const tErrors = useTranslations("dashboard.common.errors");
    const [dialog, setDialog] = useState<"archive" | "delete" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function confirm() {
        const action = dialog === "archive" ? archiveDogAction : deleteDogAction;
        startTransition(async () => {
            // On success the action redirects to the list with a notice.
            const result = await action(dogId);
            if (!result.ok) setError(tErrors(result.formError?.key ?? "generic"));
        });
    }

    const close = () => {
        setDialog(null);
        setError(null);
    };

    return (
        <Card as="section" aria-labelledby="danger-heading">
            <h2 id="danger-heading" className="mb-2 font-display text-xl font-bold text-status-red">
                {t("heading")}
            </h2>
            <p className="mb-4 text-[13px] text-stone-600">{t("description", { name: dogName })}</p>
            <div className="flex flex-wrap gap-2.5">
                {!archived && (
                    <Button variant="secondary" onClick={() => setDialog("archive")}>
                        {t("archive")}
                    </Button>
                )}
                <Button variant="danger" onClick={() => setDialog("delete")}>
                    {t("delete")}
                </Button>
            </div>

            <ConfirmDialog
                open={dialog === "archive"}
                title={t("archiveTitle", { name: dogName })}
                description={t("archiveDescription", { name: dogName })}
                confirmLabel={pending ? t("working") : t("archiveConfirm")}
                cancelLabel={t("cancel")}
                pending={pending}
                error={error}
                onConfirm={confirm}
                onCancel={close}
            />
            <ConfirmDialog
                open={dialog === "delete"}
                tone="danger"
                title={t("deleteTitle", { name: dogName })}
                description={t("deleteDescription", { name: dogName })}
                confirmLabel={pending ? t("working") : t("deleteConfirm")}
                cancelLabel={t("cancel")}
                pending={pending}
                error={error}
                onConfirm={confirm}
                onCancel={close}
            />
        </Card>
    );
}
