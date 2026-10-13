import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { BadgeCheck, Flag, MessageSquareQuote } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getReviewSummary, listReviews, REVIEWS_PAGE_SIZE } from "@/lib/dashboard/reviews";
import { initialsOf } from "@/lib/dashboard/messages";
import type { Review, ReviewStatusFilter } from "@/lib/dashboard/types";
import { replyToReviewAction, reportReviewAction } from "./actions";
import Badge from "@/components/dashboard/ui/Badge";
import Card from "@/components/dashboard/ui/Card";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import PageLink from "@/components/dashboard/ui/PageLink";
import InviteCard from "@/components/dashboard/reviews/InviteCard";
import ReviewActions from "@/components/dashboard/reviews/ReviewActions";
import Stars from "@/components/dashboard/reviews/Stars";
import { formatRelativeTime } from "@/components/dashboard/relativeTime";

type SearchParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

const STATUSES: ReviewStatusFilter[] = ["all", "needs-reply", "replied", "reported"];
const TAB_KEYS: Record<ReviewStatusFilter, "all" | "needsReply" | "replied" | "reported"> = { all: "all", "needs-reply": "needsReply", replied: "replied", reported: "reported" };

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.reviews");
    return { title: t("title") };
}

/** Rating summary, invite card, status tabs (?status=) and the paginated review list (?page=). */
export default async function ReviewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const raw = await searchParams;
    const status = STATUSES.find((s) => s === one(raw.status)) ?? "all";
    const page = Math.max(1, Number.parseInt(one(raw.page) ?? "1", 10) || 1);

    const [t, tTime, format, summary, result] = await Promise.all([
        getTranslations("dashboard.reviews"),
        getTranslations("dashboard.common.time"),
        getFormatter(),
        getReviewSummary(kennel.id),
        listReviews(kennel.id, { status, page }),
    ]);
    const now = new Date();
    const lastPage = Math.max(1, Math.ceil(result.total / REVIEWS_PAGE_SIZE));
    const counts: Record<ReviewStatusFilter, number> = { all: summary.total, "needs-reply": summary.needsReply, replied: summary.replied, reported: summary.reported };
    const hrefFor = (next: { status?: ReviewStatusFilter; page?: number }) => {
        const params = new URLSearchParams();
        const s = next.status ?? status;
        if (s !== "all") params.set("status", s);
        if (next.page && next.page > 1) params.set("page", String(next.page));
        const query = params.toString();
        return `/dashboard/reviews${query ? `?${query}` : ""}`;
    };
    const averageText = format.number(summary.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    return (
        <>
            <PageHeader title={t("title")} subtitle={t("subtitle", { kennelName: kennel.name })} />

            <div className="mb-7 flex flex-wrap items-start gap-6">
                <Card as="section" aria-labelledby="rating-summary-heading" className="flex min-w-0 flex-[2_1_440px] flex-wrap items-center gap-8">
                    <h2 id="rating-summary-heading" className="sr-only">
                        {t("summary.heading")}
                    </h2>
                    <div className="flex-[0_0_140px] text-center">
                        <p className="font-display text-6xl leading-none font-bold">{summary.total ? averageText : "–"}</p>
                        <Stars rating={summary.average} label={t("summary.outOf", { average: averageText })} size="lg" className="mt-2.5 mb-1.5 justify-center" />
                        <p className="text-[13px] text-stone-500">{t("summary.count", { count: summary.total })}</p>
                    </div>
                    <ul className="flex flex-[1_1_220px] flex-col gap-2" aria-label={t("summary.distribution")}>
                        {summary.distribution.map((row) => (
                            <li key={row.stars} className="flex items-center gap-2.5 text-[13px] text-stone-600">
                                <span className="w-3.5 shrink-0" aria-hidden>
                                    {row.stars}
                                </span>
                                <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100" aria-hidden>
                                    <span className="block h-full rounded-full bg-status-amber-solid" style={{ width: `${row.percent}%` }} />
                                </span>
                                <span className="w-7 shrink-0 text-right" aria-hidden>
                                    {row.count}
                                </span>
                                <span className="sr-only">{t("summary.bar", { stars: row.stars, count: row.count })}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
                <InviteCard />
            </div>

            <nav aria-label={t("tabs.label")} className="mb-5">
                <ul className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => {
                        const active = s === status;
                        return (
                            <li key={s}>
                                <Link
                                    href={hrefFor({ status: s })}
                                    aria-current={active ? "page" : undefined}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                                        active ? "border-stone-900 bg-stone-900 text-stone-50" : "border-line-strong bg-white text-stone-700 hover:bg-stone-50"
                                    }`}
                                >
                                    {t(`tabs.${TAB_KEYS[s]}`)}
                                    <span className="font-medium opacity-70">{counts[s]}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {summary.total === 0 ? (
                <EmptyState icon={<MessageSquareQuote className="size-6" strokeWidth={1.8} />} title={t("empty.none")} description={t("empty.noneHelp")} />
            ) : result.items.length === 0 ? (
                <EmptyState
                    title={t("empty.filtered")}
                    description={t(`empty.filteredHelp.${TAB_KEYS[status]}`)}
                    action={
                        <Link href={hrefFor({ status: "all" })} className="text-sm font-semibold text-accent hover:underline">
                            {t("empty.showAll")}
                        </Link>
                    }
                />
            ) : (
                <>
                    <ul className="mb-6 flex flex-col gap-4">
                        {result.items.map((review) => (
                            <li key={review.id}>
                                <ReviewCard
                                    review={review}
                                    date={formatRelativeTime(format, tTime, review.createdAt, now)}
                                    labels={{
                                        verified: t("card.verifiedBuyer"),
                                        rating: t("card.rating", { rating: review.rating }),
                                        reported: t("card.reported"),
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13px] text-stone-500">{t("showing", { shown: result.items.length, total: result.total })}</p>
                        <nav aria-label={t("pagination")} className="flex gap-2">
                            <PageLink href={page > 1 ? hrefFor({ page: page - 1 }) : null} label={t("previous")} />
                            <PageLink href={page < lastPage ? hrefFor({ page: page + 1 }) : null} label={t("next")} />
                        </nav>
                    </div>
                </>
            )}
        </>
    );
}

function ReviewCard({ review, date, labels }: { review: Review; date: string; labels: { verified: string; rating: string; reported: string } }) {
    const firstName = review.reviewerName.split(/\s+/)[0] ?? review.reviewerName;
    return (
        <Card as="article" aria-labelledby={`review-${review.id}-name`} className="px-5 py-6 sm:px-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-600" aria-hidden>
                        {initialsOf(review.reviewerName)}
                    </span>
                    <div className="min-w-0">
                        <h3 id={`review-${review.id}-name`} className="text-[15px] font-semibold text-stone-900">
                            {review.reviewerName}
                        </h3>
                        {(review.purchaseLabel || review.verified) && (
                            <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-stone-500">
                                {review.purchaseLabel}
                                {review.purchaseLabel && review.verified && <span aria-hidden>·</span>}
                                {review.verified && (
                                    <span className="inline-flex items-center gap-1 font-medium text-status-green">
                                        <BadgeCheck className="size-3.5" aria-hidden />
                                        {labels.verified}
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    {review.reportedAt && (
                        <Badge tone="amber" className="gap-1">
                            <Flag className="size-3" aria-hidden />
                            {labels.reported}
                        </Badge>
                    )}
                    <Stars rating={review.rating} label={labels.rating} />
                    <time dateTime={review.createdAt} className="text-xs text-stone-500">
                        {date}
                    </time>
                </div>
            </div>
            <p className="mb-4 text-[15px] leading-relaxed whitespace-pre-line text-stone-700">{review.body}</p>
            <ReviewActions
                reviewId={review.id}
                reviewerFirstName={firstName}
                reply={review.reply}
                reported={review.reportedAt !== null}
                replyAction={replyToReviewAction.bind(null, review.id)}
                reportAction={reportReviewAction.bind(null, review.id)}
            />
        </Card>
    );
}
