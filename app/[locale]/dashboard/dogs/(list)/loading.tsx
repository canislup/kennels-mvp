import { getTranslations } from "next-intl/server";

// Skeleton for the Dogs list while the roster loads.
export default async function DogsLoading() {
    const t = await getTranslations("dashboard.common");
    return (
        <div aria-busy="true" aria-live="polite" className="animate-pulse">
            <span className="sr-only">{t("loading")}</span>
            <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                    <div className="mb-2.5 h-8 w-32 rounded-lg bg-stone-100" />
                    <div className="h-4 w-72 max-w-full rounded bg-stone-100" />
                </div>
                <div className="h-10.5 w-28 rounded-xl bg-stone-100" />
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="h-9 w-28 rounded-full bg-stone-100" />
                ))}
            </div>
            <div className="mb-6 h-11 rounded-xl bg-stone-100" />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
                {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="rounded-2xl border border-line">
                        <div className="h-42.5 rounded-t-[15px] bg-stone-100" />
                        <div className="space-y-2.5 p-4">
                            <div className="h-5 w-24 rounded bg-stone-100" />
                            <div className="h-3.5 w-40 rounded bg-stone-100" />
                            <div className="h-7 w-28 rounded-full bg-stone-100" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
