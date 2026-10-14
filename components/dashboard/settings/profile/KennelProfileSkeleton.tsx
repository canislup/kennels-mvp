import { getTranslations } from "next-intl/server";

const block = "rounded bg-stone-100";

/** Loading placeholder for the Kennel profile tab: form cards left, preview and strength right (from lg). */
export default async function KennelProfileSkeleton() {
    const t = await getTranslations("dashboard.common");
    return (
        <div data-wide aria-busy="true" aria-live="polite" className="flex animate-pulse flex-col gap-6 lg:flex-row lg:items-start">
            <span className="sr-only">{t("loading")}</span>
            <div className="flex min-w-0 flex-col gap-6 lg:flex-[3_1_0%]">
                {[4, 1, 3].map((fields, i) => (
                    <div key={i} className="rounded-2xl border border-line p-6">
                        <div className={`mb-2 h-5 w-40 ${block}`} />
                        <div className={`mb-6 h-3.5 w-64 max-w-full ${block}`} />
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
                            {Array.from({ length: fields }, (_, j) => (
                                <div key={j}>
                                    <div className={`mb-2 h-3.5 w-24 ${block}`} />
                                    <div className="h-11 rounded-xl bg-stone-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex min-w-0 flex-col gap-6 lg:flex-[2_1_0%]">
                <div className="overflow-hidden rounded-2xl border border-line">
                    <div className="h-14 border-b border-line" />
                    <div className="h-27.5 bg-stone-100" />
                    <div className="p-6">
                        <div className={`mb-3 h-6 w-48 ${block}`} />
                        <div className={`mb-2 h-3.5 w-full ${block}`} />
                        <div className={`h-3.5 w-3/4 ${block}`} />
                    </div>
                </div>
                <div className="rounded-2xl border border-line p-6">
                    <div className={`mb-4 h-5 w-36 ${block}`} />
                    <div className="h-2 rounded-full bg-stone-100" />
                </div>
            </div>
        </div>
    );
}
