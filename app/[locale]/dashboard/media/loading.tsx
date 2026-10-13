import { getTranslations } from "next-intl/server";

// Skeleton for the gallery while it loads.
export default async function MediaLoading() {
    const t = await getTranslations("dashboard.common");
    return (
        <div aria-busy="true" aria-live="polite" className="animate-pulse">
            <span className="sr-only">{t("loading")}</span>
            <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                    <div className="mb-2.5 h-8 w-32 rounded-lg bg-stone-100" />
                    <div className="h-4 w-80 max-w-full rounded bg-stone-100" />
                </div>
                <div className="h-10.5 w-36 rounded-xl bg-stone-100" />
            </div>
            <div className="mb-7 h-25 rounded-2xl border-2 border-dashed border-line" />
            <div className="mb-5 flex gap-2">
                <div className="h-9 w-28 rounded-full bg-stone-100" />
                <div className="h-9 w-28 rounded-full bg-stone-100" />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4.5">
                {Array.from({ length: 8 }, (_, i) => (
                    <div key={i}>
                        <div className="aspect-4/3 rounded-[14px] bg-stone-100" />
                        <div className="mt-2 h-4 w-2/3 rounded bg-stone-100" />
                    </div>
                ))}
            </div>
        </div>
    );
}
