import { getTranslations } from "next-intl/server";

// Skeleton for the Litters screen while it loads.
export default async function LittersLoading() {
    const t = await getTranslations("dashboard.common");
    return (
        <div aria-busy="true" aria-live="polite" className="animate-pulse">
            <span className="sr-only">{t("loading")}</span>
            <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                    <div className="mb-2.5 h-8 w-32 rounded-lg bg-stone-100" />
                    <div className="h-4 w-80 max-w-full rounded bg-stone-100" />
                </div>
                <div className="h-10.5 w-28 rounded-xl bg-stone-100" />
            </div>
            <div className="mb-6 flex flex-wrap gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="h-9 w-24 rounded-full bg-stone-100" />
                ))}
            </div>
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex flex-col gap-3.5 lg:w-[38%]">
                    {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="h-33 rounded-2xl border border-line" />
                    ))}
                </div>
                <div className="flex flex-1 flex-col gap-6">
                    <div className="h-80 rounded-2xl border border-line" />
                    <div className="h-60 rounded-2xl border border-line" />
                </div>
            </div>
        </div>
    );
}
