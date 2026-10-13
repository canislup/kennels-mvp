import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getFormatter, getTranslations } from "next-intl/server";
import { Check, Heart, MessageSquare, PawPrint, Star, Users, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getOverview } from "@/lib/dashboard/overview";
import type { ActivityItem, ActivityType, DogStatus, Overview, UpcomingItem } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import Card from "@/components/dashboard/ui/Card";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import ProgressBar from "@/components/dashboard/ui/ProgressBar";
import Greeting from "@/components/dashboard/overview/Greeting";
import { serverDayPeriod } from "@/components/dashboard/overview/dayPeriod";
import { calendarDaysBetween, formatRelativeTime } from "@/components/dashboard/relativeTime";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.shell.nav");
    return { title: t("overview") };
}

const ACTIVITY_STYLE: Record<ActivityType, { icon: LucideIcon; tile: string }> = {
    NEW_LEAD: { icon: Users, tile: "bg-accent-soft text-accent" },
    NEW_MESSAGE: { icon: MessageSquare, tile: "bg-status-blue-bg text-status-blue" },
    NEW_REVIEW: { icon: Star, tile: "bg-status-amber-bg text-status-amber" },
    DOG_STATUS_CHANGED: { icon: Heart, tile: "bg-status-pink-bg text-status-pink" },
    LITTER_BORN: { icon: Check, tile: "bg-status-green-bg text-status-green" },
};

export default async function OverviewPage() {
    const kennel = await getCurrentKennel();
    const t = await getTranslations("dashboard.overview");

    // Signed in but no kennel yet: send them to setup.
    if (!kennel) {
        return (
            <div className="mx-auto max-w-xl pt-10">
                <EmptyState
                    icon={<PawPrint className="size-6" strokeWidth={1.8} />}
                    title={t("onboarding.title")}
                    description={t("onboarding.description")}
                    action={<Button href="/dashboard/kennel/setup">{t("onboarding.cta")}</Button>}
                />
            </div>
        );
    }

    const [overview, format, cookieStore] = await Promise.all([getOverview(kennel.id), getFormatter(), cookies()]);
    const [tTime, tCommon] = await Promise.all([getTranslations("dashboard.common.time"), getTranslations("dashboard.common")]);
    const statusLabel = (status: DogStatus) => tCommon(`dogStatus.${status}`);
    const now = new Date();
    const firstName = kennel.ownerName.trim().split(/\s+/)[0] ?? kennel.ownerName;

    return (
        <>
            <PageHeader
                title={<Greeting firstName={firstName} serverPeriod={serverDayPeriod(cookieStore, now)} />}
                subtitle={t("subtitle", { kennelName: kennel.name })}
                actions={
                    <>
                        <Button href="/dashboard/litters/new" variant="secondary">
                            {t("actions.newLitter")}
                        </Button>
                        <Button href="/dashboard/dogs/new">{t("actions.addDog")}</Button>
                    </>
                }
            />

            <SetupChecklist steps={overview.setupSteps} t={t} />

            <MetricCards metrics={overview.metrics} now={now} t={t} format={format} />

            <div className="flex flex-wrap items-start gap-6">
                <Card as="section" aria-labelledby="overview-activity" className="min-w-0 flex-[2_1_460px]">
                    <h2 id="overview-activity" className="mb-4 font-display text-xl font-bold">
                        {t("activity.heading")}
                    </h2>
                    {overview.recentActivity.length === 0 ? (
                        <EmptyState compact title={t("activity.empty")} />
                    ) : (
                        <ul>
                            {overview.recentActivity.map((item) => {
                                const { icon: Icon, tile } = ACTIVITY_STYLE[item.type];
                                const { title, detail } = activityText(item, t, kennel.name, statusLabel);
                                return (
                                    <li key={item.id} className="flex gap-3.5 border-t border-line py-3.5">
                                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${tile}`} aria-hidden>
                                            <Icon className="size-4.25" strokeWidth={1.8} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-stone-900">{title}</p>
                                            <p className="mt-0.5 text-[13px] text-stone-500">{detail}</p>
                                        </div>
                                        <time dateTime={item.createdAt} className="text-xs whitespace-nowrap text-stone-500">
                                            {formatRelativeTime(format, tTime, item.createdAt, now)}
                                        </time>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>

                <Card as="section" aria-labelledby="overview-upcoming" className="min-w-0 flex-[1_1_320px]">
                    <h2 id="overview-upcoming" className="mb-4 font-display text-xl font-bold">
                        {t("upcoming.heading")}
                    </h2>
                    {overview.upcoming.length === 0 ? (
                        <EmptyState compact title={t("upcoming.empty")} />
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {overview.upcoming.map((item) => {
                                const due = new Date(item.dueAt);
                                const { title, detail } = upcomingText(item, t, calendarDaysBetween(now, due));
                                return (
                                    <li key={item.id} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                                        <time
                                            dateTime={item.dueAt}
                                            className="flex w-13 shrink-0 flex-col rounded-[10px] border border-line bg-white py-1.5 text-center"
                                        >
                                            <span className="text-[11px] font-semibold text-accent uppercase">
                                                {format.dateTime(due, { month: "short" }).replace(/\.$/, "")}
                                            </span>
                                            <span className="text-lg leading-tight font-bold">{format.dateTime(due, { day: "numeric" })}</span>
                                        </time>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-stone-900">{title}</p>
                                            <p className="mt-0.5 text-xs text-stone-500">{detail}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <Link
                        href="/dashboard/leads"
                        className="mt-4 inline-block rounded text-[13px] font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {t("upcoming.seeAll")}
                    </Link>
                </Card>
            </div>
        </>
    );
}

type T = Awaited<ReturnType<typeof getTranslations<"dashboard.overview">>>;
type Format = Awaited<ReturnType<typeof getFormatter>>;

function SetupChecklist({ steps, t }: { steps: Overview["setupSteps"]; t: T }) {
    const done = steps.filter((step) => step.done).length;
    if (done === steps.length) return null;
    const percent = Math.round((done / steps.length) * 100);
    const nextKey = steps.find((step) => !step.done)?.key;

    return (
        <Card as="section" aria-labelledby="overview-setup" className="mb-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 id="overview-setup" className="mb-1 font-display text-xl font-bold">
                        {t("setup.heading")}
                    </h2>
                    <p className="text-sm text-stone-600">{t("setup.summary", { done, total: steps.length })}</p>
                </div>
                <div className="flex min-w-50 flex-1 items-center gap-3 sm:flex-none">
                    <ProgressBar value={percent} label={t("setup.progressLabel")} className="flex-1 sm:w-40" />
                    <span className="text-[13px] font-semibold">{t("setup.percent", { percent })}</span>
                </div>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                {steps.map((step) => {
                    const state = step.done ? "done" : step.key === nextKey ? "next" : "todo";
                    return (
                        <li
                            key={step.key}
                            className={`flex items-center gap-2.5 rounded-xl border p-3 ${
                                state === "next" ? "border-accent bg-accent-soft" : "border-line bg-white"
                            }`}
                        >
                            <span
                                className={`flex size-5.5 shrink-0 items-center justify-center rounded-full border-2 ${
                                    state === "done"
                                        ? "border-status-green-solid bg-status-green-solid"
                                        : state === "next"
                                          ? "border-accent bg-white"
                                          : "border-line-strong bg-white"
                                }`}
                                aria-hidden
                            >
                                {state === "done" && <Check className="size-3 text-white" strokeWidth={3.5} />}
                            </span>
                            <span className={`text-[13px] font-medium ${state === "done" ? "text-stone-600" : "text-stone-900"}`}>
                                {t(`setup.steps.${step.key}`)}
                                <span className="sr-only"> ({t(`setup.state.${state}`)})</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}

function MetricCards({ metrics, now, t, format }: { metrics: Overview["metrics"]; now: Date; t: T; format: Format }) {
    const daysSince = (iso: string | null) => (iso ? calendarDaysBetween(new Date(iso), now) : null);
    const daysUntil = (iso: string | null) => (iso ? calendarDaysBetween(now, new Date(iso)) : null);
    const oldest = daysSince(metrics.unreadMessages.oldestUnreadAt);
    const goHome = daysUntil(metrics.activeLitters.nextGoHomeAt);

    const cards = [
        {
            key: "newLeads",
            href: "/dashboard/leads",
            value: metrics.newLeads.count,
            note: t("metrics.newLeads.note", { count: metrics.newLeads.sinceYesterday }),
        },
        {
            key: "unreadMessages",
            href: "/dashboard/messages",
            value: metrics.unreadMessages.count,
            note: oldest === null ? t("metrics.unreadMessages.noneWaiting") : t("metrics.unreadMessages.note", { days: oldest }),
        },
        {
            key: "availablePuppies",
            href: "/dashboard/litters",
            value: metrics.availablePuppies.count,
            note: t("metrics.availablePuppies.note", { count: metrics.availablePuppies.litterCount }),
        },
        {
            key: "activeLitters",
            href: "/dashboard/litters",
            value: metrics.activeLitters.count,
            note: goHome === null ? t("metrics.activeLitters.noneScheduled") : t("metrics.activeLitters.note", { days: goHome }),
        },
    ] as const;

    return (
        <section aria-label={t("metrics.label")} className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {cards.map((card) => (
                <Link
                    key={card.key}
                    href={card.href}
                    className="block rounded-2xl border border-line bg-white p-5 transition-colors hover:border-line-strong hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    <div className="mb-2.5 text-[13px] text-stone-500">{t(`metrics.${card.key}.label`)}</div>
                    <div className="mb-2 font-display text-[38px] leading-none font-bold">{format.number(card.value)}</div>
                    <div className="text-[13px] text-stone-600">{card.note}</div>
                </Link>
            ))}
        </section>
    );
}

function activityText(
    item: ActivityItem,
    t: T,
    kennelName: string,
    statusLabel: (status: DogStatus) => string,
): { title: string; detail: string } {
    switch (item.type) {
        case "NEW_LEAD":
            return { title: t("activity.newLead.title", item.params), detail: t("activity.newLead.detail", item.params) };
        case "NEW_MESSAGE":
            return { title: t("activity.newMessage.title", item.params), detail: t("activity.newMessage.detail", item.params) };
        case "NEW_REVIEW":
            return {
                title: t("activity.newReview.title", { rating: item.params.rating }),
                detail: t("activity.newReview.detail", { reviewerName: item.params.reviewerName, kennelName }),
            };
        case "DOG_STATUS_CHANGED":
            return {
                title: t("activity.dogStatusChanged.title", {
                    dogName: item.params.dogName,
                    status: statusLabel(item.params.status),
                }),
                detail: t("activity.dogStatusChanged.detail"),
            };
        case "LITTER_BORN":
            return {
                title: t("activity.litterBorn.title", { damName: item.params.damName }),
                detail: t("activity.litterBorn.detail", { count: item.params.puppyCount }),
            };
    }
}

function upcomingText(item: UpcomingItem, t: T, daysUntil: number): { title: string; detail: string } {
    switch (item.type) {
        case "LEAD_FOLLOW_UP":
            return {
                title: t("upcoming.followUp.title", item.params),
                detail: daysUntil < 0 ? t("upcoming.followUp.overdue") : t("upcoming.followUp.detail", { days: daysUntil }),
            };
        case "LITTER_GO_HOME":
            return {
                title: t("upcoming.goHome.title", { litterName: item.params.litterName }),
                detail: t("upcoming.goHome.detail", { puppies: item.params.puppyCount, reserved: item.params.reservedCount }),
            };
    }
}
