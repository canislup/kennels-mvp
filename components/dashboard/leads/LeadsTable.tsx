import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Card from "@/components/dashboard/ui/Card";
import { DUE_BADGE, STAGE_PILL } from "./leadMeta";
import type { LeadCardView } from "./leadView";

const linkClasses =
    "rounded text-[13px] font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** List view: every lead (old sold ones too), same table style as the litter puppies table. */
export default async function LeadsTable({
    showReason = false,
    items,
    total,
    previousHref,
    nextHref,
}: {
    /** Lost filter: add a Reason column. */
    showReason?: boolean;
    items: LeadCardView[];
    total: number;
    previousHref: string | null;
    nextHref: string | null;
}) {
    const t = await getTranslations("dashboard.leads");
    const th = "px-3 py-2.5 font-semibold";
    return (
        <>
            <Card padding="none">
                <div className="relative overflow-x-auto">
                    <table className="w-full min-w-200 border-collapse text-left">
                        <thead>
                            <tr className="border-b border-line text-xs text-stone-500">
                                <th scope="col" className={`${th} pl-5`}>{t("table.columns.name")}</th>
                                <th scope="col" className={th}>{t("table.columns.stage")}</th>
                                {showReason && <th scope="col" className={th}>{t("table.columns.reason")}</th>}
                                <th scope="col" className={th}>{t("table.columns.interest")}</th>
                                <th scope="col" className={th}>{t("table.columns.source")}</th>
                                <th scope="col" className={th}>{t("table.columns.followUp")}</th>
                                <th scope="col" className={th}>{t("table.columns.lastActivity")}</th>
                                <th scope="col" className={`${th} pr-5`}>
                                    <span className="sr-only">{t("table.columns.actions")}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {items.map((lead) => (
                                <tr key={lead.id} className="border-b border-line last:border-b-0">
                                    <th scope="row" className="py-3 pr-3 pl-5 font-semibold text-stone-900">
                                        <span className="flex items-center gap-2">
                                            {lead.name}
                                            {lead.unread && (
                                                <span className="size-2 shrink-0 rounded-full bg-accent">
                                                    <span className="sr-only">{t("card.unread")}</span>
                                                </span>
                                            )}
                                        </span>
                                    </th>
                                    <td className="px-3 py-3">
                                        <span className={`rounded-full px-2.5 py-0.75 text-xs font-semibold whitespace-nowrap ${STAGE_PILL[lead.stage]}`}>{t(`stages.${lead.stage}`)}</span>
                                    </td>
                                    {showReason && <td className="px-3 py-3 text-stone-700">{lead.lostReason}</td>}
                                    <td className="px-3 py-3 text-stone-700">{lead.interest}</td>
                                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{lead.sourceLabel}</td>
                                    <td className="px-3 py-3">
                                        {lead.followUp ? (
                                            <span className={`rounded-full px-2.25 py-0.75 text-xs font-semibold whitespace-nowrap ${DUE_BADGE[lead.followUp.tone]}`}>{lead.followUp.label}</span>
                                        ) : (
                                            <span className="text-stone-400">{t("table.noFollowUp")}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-stone-500">{lead.activity}</td>
                                    <td className="py-3 pr-5 pl-3 text-right">
                                        <Link href={lead.href} className={linkClasses}>
                                            {t("table.open")}
                                            <span className="sr-only"> {lead.name}</span>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-stone-500" aria-live="polite">
                    {t("table.showing", { shown: items.length, total })}
                </p>
                <nav aria-label={t("table.paginationLabel")} className="flex gap-2">
                    <PageLink href={previousHref} label={t("table.previous")} />
                    <PageLink href={nextHref} label={t("table.next")} />
                </nav>
            </div>
        </>
    );
}

function PageLink({ href, label }: { href: string | null; label: string }) {
    const classes = "rounded-xl border border-line-strong bg-white px-4 py-2.25 text-[13px] font-medium";
    if (!href) {
        return (
            <span aria-disabled="true" className={`${classes} cursor-not-allowed text-stone-400`}>
                {label}
            </span>
        );
    }
    return (
        <Link href={href} className={`${classes} text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}>
            {label}
        </Link>
    );
}
