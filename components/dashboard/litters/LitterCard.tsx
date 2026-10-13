import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LitterListItem } from "@/lib/dashboard/types";
import ProgressBar from "@/components/dashboard/ui/ProgressBar";
import { fromDateOnly } from "../dateOnly";
import { LITTER_BAR, LITTER_DETAIL_ID, LITTER_PILL } from "./litterMeta";

/** One litter in the master list. A link that selects it (`?litter=<id>`). */
export default async function LitterCard({ litter, href, selected }: { litter: LitterListItem; href: string; selected: boolean }) {
    const [t, format] = await Promise.all([getTranslations("dashboard.litters"), getFormatter()]);
    const { stats } = litter;
    const percent = Math.round(stats.placedShare * 100);
    const thisYear = new Date().getFullYear();

    const parents =
        litter.damName && litter.sireName
            ? t("card.parentsBoth", { breed: litter.breed, dam: litter.damName, sire: litter.sireName })
            : litter.damName || litter.sireName
              ? t("card.parentsOne", { breed: litter.breed, parent: (litter.damName ?? litter.sireName)! })
              : t("card.parentsNone", { breed: litter.breed });

    const dateLine = (() => {
        if (!litter.expectedGoHomeDate) return t("card.date.notSet");
        const date = fromDateOnly(litter.expectedGoHomeDate);
        const withYear = date.getFullYear() !== thisYear;
        switch (litter.status) {
            case "PLANNED":
                return t("card.date.expected", { date: format.dateTime(date, { month: "short", year: "numeric" }) });
            case "SOLD_OUT":
                return t("card.date.wentHome", { date: format.dateTime(date, withYear ? { month: "short", year: "numeric" } : { month: "short" }) });
            default:
                return t("card.date.goHome", {
                    date: format.dateTime(date, withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" }),
                });
        }
    })();

    return (
        <Link
            href={href}
            scroll={false}
            aria-current={selected ? "true" : undefined}
            aria-controls={LITTER_DETAIL_ID}
            className={`block rounded-2xl border-2 bg-white p-4.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected ? "border-accent" : "border-line hover:border-line-strong"
            }`}
        >
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-display text-lg font-bold text-stone-900">{litter.name}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LITTER_PILL[litter.status]}`}>{t(`status.${litter.status}`)}</span>
            </div>
            <p className="mb-3 text-[13px] text-stone-600">{parents}</p>
            <ProgressBar
                value={percent}
                label={t("card.progressLabel", { name: litter.name })}
                valueText={t("card.placed", { percent })}
                barClassName={LITTER_BAR[litter.status]}
                className="mb-2 h-1.5"
            />
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-stone-500">
                <span>
                    {stats.totalPuppies === 0 ? t("card.countNotSet") : t("card.count", { available: stats.available, total: stats.totalPuppies })}
                    <span className="sr-only">, {t("card.placed", { percent })}</span>
                </span>
                <span>{dateLine}</span>
            </div>
        </Link>
    );
}
