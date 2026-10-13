import { getTranslations } from "next-intl/server";

/** Loading placeholder for a Settings tab (the title and tab bar stay, from the layout). */
export default async function SettingsSkeleton({ cards = 2 }: { cards?: number }) {
    const t = await getTranslations("dashboard.common");
    return (
        <div aria-busy="true" aria-live="polite" className="flex animate-pulse flex-col gap-6">
            <span className="sr-only">{t("loading")}</span>
            {Array.from({ length: cards }, (_, i) => (
                <div key={i} className="rounded-2xl border border-line p-6">
                    <div className="mb-2 h-5 w-44 rounded bg-stone-100" />
                    <div className="mb-6 h-3.5 w-72 max-w-full rounded bg-stone-100" />
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4.5">
                        {Array.from({ length: 3 }, (_, j) => (
                            <div key={j}>
                                <div className="mb-2 h-3.5 w-24 rounded bg-stone-100" />
                                <div className="h-11 rounded-xl bg-stone-100" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
