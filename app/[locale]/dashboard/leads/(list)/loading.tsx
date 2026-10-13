import { getTranslations } from "next-intl/server";

// Skeleton for the Leads board while it loads.
export default async function LeadsLoading() {
    const t = await getTranslations("dashboard.common");
    return (
        <div aria-busy="true" aria-live="polite" className="animate-pulse">
            <span className="sr-only">{t("loading")}</span>
            <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                    <div className="mb-2.5 h-8 w-32 rounded-lg bg-stone-100" />
                    <div className="h-4 w-96 max-w-full rounded bg-stone-100" />
                </div>
                <div className="h-10.5 w-28 rounded-xl bg-stone-100" />
            </div>
            <div className="mb-6 h-11 rounded-xl bg-stone-100" />
            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="w-68 shrink-0 space-y-2.5 rounded-2xl border border-line p-3">
                        <div className="h-6 w-24 rounded bg-stone-100" />
                        <div className="h-24 rounded-xl bg-stone-100" />
                        <div className="h-24 rounded-xl bg-stone-100" />
                    </div>
                ))}
            </div>
        </div>
    );
}
