import { getTranslations } from "next-intl/server";

// Skeleton for the inbox while it loads.
export default async function MessagesLoading() {
    const t = await getTranslations("dashboard.common");
    return (
        <div aria-busy="true" aria-live="polite" className="animate-pulse">
            <span className="sr-only">{t("loading")}</span>
            <div className="mb-7">
                <div className="mb-2.5 h-8 w-40 rounded-lg bg-stone-100" />
                <div className="h-4 w-80 max-w-full rounded bg-stone-100" />
            </div>
            <div className="flex h-130 overflow-hidden rounded-2xl border border-line">
                <div className="w-full space-y-3 p-4 lg:w-80 lg:border-r lg:border-line">
                    <div className="h-10 rounded-xl bg-stone-100" />
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="h-14 rounded-xl bg-stone-100" />
                    ))}
                </div>
                <div className="hidden flex-1 flex-col gap-4 p-6 lg:flex">
                    <div className="h-10 w-1/2 rounded-xl bg-stone-100" />
                    <div className="h-16 w-2/3 rounded-xl bg-stone-100" />
                    <div className="ml-auto h-16 w-2/3 rounded-xl bg-stone-100" />
                </div>
            </div>
        </div>
    );
}
