import { getTranslations } from "next-intl/server";

// Skeleton for Reviews while it loads: summary + invite cards, tabs, review cards.
export default async function ReviewsLoading() {
    const t = await getTranslations("dashboard.common");
    return (
        <div aria-busy="true" aria-live="polite" className="animate-pulse">
            <span className="sr-only">{t("loading")}</span>
            <div className="mb-7">
                <div className="mb-2.5 h-8 w-36 rounded-lg bg-stone-100" />
                <div className="h-4 w-96 max-w-full rounded bg-stone-100" />
            </div>
            <div className="mb-7 flex flex-wrap gap-6">
                <div className="h-44 min-w-0 flex-[2_1_440px] rounded-2xl border border-line" />
                <div className="h-44 min-w-0 flex-[1_1_320px] rounded-2xl border border-line" />
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="h-9 w-28 rounded-full bg-stone-100" />
                ))}
            </div>
            <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="rounded-2xl border border-line p-6">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="size-10 rounded-full bg-stone-100" />
                            <div className="h-4 w-40 rounded bg-stone-100" />
                        </div>
                        <div className="mb-2 h-3.5 w-full rounded bg-stone-100" />
                        <div className="h-3.5 w-3/4 rounded bg-stone-100" />
                    </div>
                ))}
            </div>
        </div>
    );
}
