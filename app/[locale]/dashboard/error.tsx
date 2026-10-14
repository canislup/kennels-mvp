"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/dashboard/ui/Button";

/** Error boundary for dashboard pages: the shell stays, the page area offers a retry. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const t = useTranslations("dashboard.boundaries.error");
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div role="alert" className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white px-6 py-16 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-status-red-bg text-status-red" aria-hidden>
                <AlertTriangle className="size-6" strokeWidth={1.8} />
            </div>
            <h1 className="font-display text-2xl font-bold text-stone-900">{t("title")}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">{t("description")}</p>
            {error.digest && <p className="mt-2 text-xs text-stone-500">{t("reference", { digest: error.digest })}</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <Button onClick={reset}>{t("retry")}</Button>
                <Button href="/dashboard" variant="secondary">
                    {t("back")}
                </Button>
            </div>
        </div>
    );
}
