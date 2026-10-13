"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { releasePuppyAction } from "@/app/[locale]/dashboard/leads/actions";
import Button from "@/components/dashboard/ui/Button";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";

/** "Reserved: {dog}" with Release puppy (shown only while the lead holds a puppy). */
export default function ReservationBlock({ leadId, leadName, dogId, dogName }: { leadId: string; leadName: string; dogId: string; dogName: string }) {
    const t = useTranslations("dashboard");
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function confirm() {
        startTransition(async () => {
            const result = await releasePuppyAction(leadId);
            if (result.ok) setOpen(false);
            else setError(t(`common.errors.${result.formError?.key ?? "generic"}`, result.formError?.params));
        });
    }

    return (
        <section aria-labelledby="lead-reservation" className="rounded-2xl border border-status-pink-bg bg-white p-6">
            <h2 id="lead-reservation" className="mb-2 flex items-center gap-2 font-display text-xl font-bold">
                <Heart className="size-4.5 text-status-pink" aria-hidden />
                {t("leads.detail.reservation.heading")}
            </h2>
            <p className="mb-4 text-sm text-stone-700">
                {t("leads.detail.reservation.reserved")}{" "}
                <Link href={`/dashboard/dogs/${dogId}/edit`} className="font-semibold text-accent hover:text-accent-hover hover:underline">
                    {dogName}
                </Link>
            </p>
            <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
                {t("leads.detail.reservation.release")}
            </Button>
            <ConfirmDialog
                open={open}
                title={t("leads.detail.reservation.confirmTitle", { dog: dogName })}
                description={t("leads.detail.reservation.confirmDescription", { dog: dogName, name: leadName })}
                confirmLabel={pending ? t("leads.detail.reservation.pending") : t("leads.detail.reservation.release")}
                cancelLabel={t("leads.detail.cancel")}
                pending={pending}
                error={error}
                onConfirm={confirm}
                onCancel={() => {
                    setOpen(false);
                    setError(null);
                }}
            />
        </section>
    );
}
