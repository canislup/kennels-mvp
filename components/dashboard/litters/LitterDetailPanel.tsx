import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { LinkablePuppy, LitterDetail, LitterParentSummary, WaitlistEntry } from "@/lib/dashboard/types";
import { changeLitterStatusAction, linkPuppyAction } from "@/app/[locale]/dashboard/litters/actions";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import Card from "@/components/dashboard/ui/Card";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import StatusMenu from "@/components/dashboard/ui/StatusMenu";
import { STATUS_PILL } from "@/components/dashboard/dogs/dogMeta";
import { formatRelativeTime } from "../relativeTime";
import { fromDateOnly } from "../dateOnly";
import { leadHref } from "../hrefs";
import AddPuppyDialog from "./AddPuppyDialog";
import ScrollToDetail from "./ScrollToDetail";
import { LITTER_DETAIL_ID, LITTER_LIST_ID, LITTER_PILL, LITTER_STATUS_ORDER } from "./litterMeta";

const linkClasses =
    "rounded text-[13px] font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Right-hand side of the Litters screen: the selected litter. */
export default async function LitterDetailPanel({
    litter,
    waitlist,
    linkable,
}: {
    litter: LitterDetail;
    waitlist: WaitlistEntry[];
    linkable: LinkablePuppy[];
}) {
    const [t, tDash, tTime, format] = await Promise.all([
        getTranslations("dashboard.litters"),
        getTranslations("dashboard"),
        getTranslations("dashboard.common.time"),
        getFormatter(),
    ]);
    const now = new Date();
    const longDate = (date: string) => format.dateTime(fromDateOnly(date), { dateStyle: "medium" });
    const subline = [
        litter.breed,
        litter.birthDate && t("detail.born", { date: longDate(litter.birthDate) }),
        litter.expectedGoHomeDate && t("detail.goHome", { date: longDate(litter.expectedGoHomeDate) }),
    ].filter(Boolean);
    const editHref = `/dashboard/litters/${litter.id}/edit`;
    const stats = [
        { key: "puppies", value: litter.stats.totalPuppies },
        { key: "available", value: litter.stats.available },
        { key: "reserved", value: litter.stats.reserved },
        { key: "onWaitlist", value: litter.stats.onWaitlist },
    ] as const;

    return (
        <div id={LITTER_DETAIL_ID} className="flex scroll-mt-20 flex-col gap-6">
            <ScrollToDetail litterId={litter.id} />
            <Link href={`#${LITTER_LIST_ID}`} className={`inline-flex items-center gap-1.5 self-start lg:hidden ${linkClasses}`}>
                <ArrowUp className="size-3.5" aria-hidden />
                {t("detail.backToList")}
            </Link>

            <Card as="section" aria-labelledby="litter-detail-title">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                            <h2 id="litter-detail-title" className="font-display text-2xl font-bold text-stone-900">
                                {litter.name}
                            </h2>
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LITTER_PILL[litter.status]}`}>{t(`status.${litter.status}`)}</span>
                        </div>
                        <p className="text-sm text-stone-600">{subline.join(" · ")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <Button href={editHref} variant="secondary" className="px-4 py-2.25 text-[13px]">
                            {t("detail.edit")}
                        </Button>
                        <StatusMenu
                            variant="button"
                            buttonText={t("detail.changeStatus")}
                            value={litter.status}
                            options={LITTER_STATUS_ORDER.map((status) => ({ value: status, label: t(`status.${status}`) }))}
                            action={changeLitterStatusAction.bind(null, litter.id)}
                            triggerLabels={Object.fromEntries(
                                LITTER_STATUS_ORDER.map((status) => [status, t("detail.changeStatusLabel", { name: litter.name, status: t(`status.${status}`) })]),
                            )}
                            menuLabel={t("detail.statusMenuLabel", { name: litter.name })}
                            failedMessage={t("detail.statusFailed")}
                        />
                    </div>
                </div>

                <dl className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
                    {stats.map((stat) => (
                        <div key={stat.key} className="rounded-xl bg-stone-50 p-3.5">
                            <dt className="mb-1 text-xs text-stone-500">{t(`detail.stats.${stat.key}`)}</dt>
                            <dd className="font-display text-[26px] leading-tight font-bold text-stone-900">{format.number(stat.value)}</dd>
                        </div>
                    ))}
                </dl>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                    <ParentCard role="dam" parent={litter.dam} editHref={editHref} t={t} tDash={tDash} />
                    <ParentCard role="sire" parent={litter.sire} editHref={editHref} t={t} tDash={tDash} />
                </div>
            </Card>

            <Card as="section" aria-labelledby="litter-puppies-title">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="litter-puppies-title" className="font-display text-xl font-bold">
                        {t("puppies.heading")}
                    </h2>
                    <AddPuppyDialog litterId={litter.id} breed={litter.breed} puppies={linkable} linkAction={linkPuppyAction.bind(null, litter.id)} />
                </div>
                {litter.puppies.length === 0 ? (
                    <EmptyState compact title={t("puppies.empty")} description={t("puppies.emptyHelp")} />
                ) : (
                    <div className="relative overflow-x-auto">
                        <table className="w-full min-w-115 border-collapse text-left">
                            <thead>
                                <tr className="border-b border-line text-xs font-semibold text-stone-500">
                                    <th scope="col" className="px-3 py-2.5 font-semibold">
                                        {t("puppies.columns.puppy")}
                                    </th>
                                    <th scope="col" className="px-3 py-2.5 font-semibold">
                                        {t("puppies.columns.sex")}
                                    </th>
                                    <th scope="col" className="px-3 py-2.5 font-semibold">
                                        {t("puppies.columns.status")}
                                    </th>
                                    <th scope="col" className="px-3 py-2.5">
                                        <span className="sr-only">{t("puppies.columns.actions")}</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {litter.puppies.map((puppy) => (
                                    <tr key={puppy.id} className="border-b border-line last:border-b-0">
                                        <th scope="row" className="px-3 py-3 font-semibold text-stone-900">
                                            <span className="flex items-center gap-3">
                                                <span className="size-10 shrink-0 overflow-hidden rounded-[10px] bg-linear-135 from-sand-light to-sand-dark">
                                                    {puppy.coverPhotoUrl && <img src={puppy.coverPhotoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                                                </span>
                                                {puppy.name}
                                            </span>
                                        </th>
                                        <td className="px-3 py-3 text-stone-700">{tDash(`common.sex.${puppy.sex}`)}</td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2.5 py-0.75 text-xs font-semibold ${STATUS_PILL[puppy.status]}`}>
                                                {tDash(`common.dogStatus.${puppy.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <Link href={`/dashboard/dogs/${puppy.id}/edit`} className={linkClasses}>
                                                {t("puppies.edit")}
                                                <span className="sr-only"> {puppy.name}</span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card as="section" aria-labelledby="litter-waitlist-title">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 id="litter-waitlist-title" className="font-display text-xl font-bold">
                        {t("waitlist.heading")}
                    </h2>
                    <span className="text-[13px] text-stone-500">{t("waitlist.count", { count: waitlist.length })}</span>
                </div>
                {waitlist.length === 0 ? (
                    <EmptyState compact title={t("waitlist.empty")} />
                ) : (
                    <ol>
                        {waitlist.map((entry) => (
                            <li key={entry.id} className="flex items-center gap-3.5 border-t border-line py-3">
                                <span className="flex size-7.5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
                                    <span className="sr-only">{t("waitlist.position")} </span>
                                    {entry.position}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-stone-900">{entry.name}</p>
                                    <p className="text-xs text-stone-500">
                                        {[entry.note, t("waitlist.added", { time: formatRelativeTime(format, tTime, entry.createdAt, now).toLowerCase() })]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                </div>
                                <Link href={leadHref(entry.leadId)} className={`shrink-0 ${linkClasses}`}>
                                    {t("waitlist.openLead")}
                                    <span className="sr-only"> {entry.name}</span>
                                </Link>
                            </li>
                        ))}
                    </ol>
                )}
            </Card>
        </div>
    );
}

type T = Awaited<ReturnType<typeof getTranslations<"dashboard.litters">>>;
type TDash = Awaited<ReturnType<typeof getTranslations<"dashboard">>>;

function ParentCard({ role, parent, editHref, t, tDash }: { role: "dam" | "sire"; parent: LitterParentSummary | null; editHref: string; t: T; tDash: TDash }) {
    const roleLabel = <span className="block text-[11px] font-semibold tracking-[0.4px] text-stone-500 uppercase">{t(`detail.parents.${role}`)}</span>;

    if (!parent) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-3">
                <div className="size-13 shrink-0 rounded-[10px] bg-stone-100" aria-hidden />
                <div>
                    {roleLabel}
                    <span className="block text-[15px] font-semibold text-stone-500">{t("detail.parents.notSet")}</span>
                    <Link href={editHref} className={linkClasses}>
                        {t("detail.parents.setInEdit")}
                    </Link>
                </div>
            </div>
        );
    }

    const age = parent.ageLabelParts && tDash(`common.age.${parent.ageLabelParts.unit}`, { count: parent.ageLabelParts.count });
    return (
        <Link
            href={`/dashboard/dogs/${parent.id}/edit`}
            className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-line-strong hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
            <span className="size-13 shrink-0 overflow-hidden rounded-[10px] bg-linear-135 from-sand-light to-sand-dark">
                {parent.coverPhotoUrl && <img src={parent.coverPhotoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
            </span>
            <span className="min-w-0">
                {roleLabel}
                <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold text-stone-900">{parent.name}</span>
                    {parent.archived && <Badge className="shrink-0">{t("detail.parents.archived")}</Badge>}
                </span>
                <span className="block text-xs text-stone-500">{age ? t("detail.parents.meta", { breed: parent.breed, age }) : parent.breed}</span>
            </span>
        </Link>
    );
}
