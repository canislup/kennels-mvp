import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Clock } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getKennelBreeds } from "@/lib/dashboard/dogs";
import { getFollowUpSummary, listLeadsBoard, listLeadsTable } from "@/lib/dashboard/leads";
import { getViewerToday } from "@/lib/dashboard/viewerDate";
import type { LeadFilters, LeadFollowUpFilter } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Notice from "@/components/dashboard/ui/Notice";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import UrlFilters from "@/components/dashboard/ui/UrlFilters";
import LeadBoard from "@/components/dashboard/leads/LeadBoard";
import LeadsTable from "@/components/dashboard/leads/LeadsTable";
import { toLeadCardView } from "@/components/dashboard/leads/leadView";
import { FOLLOW_UP_PARAMS, LEAD_SOURCES, LEAD_STAGE_ORDER, SOURCE_PARAM, STAGE_PARAM } from "@/components/dashboard/leads/leadMeta";
import { fromParam } from "@/components/dashboard/dogs/dogMeta";

const TABLE_PAGE_SIZE = 20;

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.leads.list");
    return { title: t("title") };
}

type SearchParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/** Board or list of leads. View, search, filters and page all live in the URL. */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();

    const raw = await searchParams;
    const view = one(raw.view) === "list" ? "list" : "board";
    const followUp = FOLLOW_UP_PARAMS.find((value) => value === one(raw.followUp)) as LeadFollowUpFilter | undefined;
    const page = Math.max(1, Number.parseInt(one(raw.page) ?? "1", 10) || 1);
    const [t, tTime, format, breeds, summary, today] = await Promise.all([
        getTranslations("dashboard.leads"),
        getTranslations("dashboard.common.time"),
        getFormatter(),
        getKennelBreeds(kennel.id),
        getFollowUpSummary(kennel.id),
        getViewerToday(),
    ]);
    const filters: LeadFilters = {
        q: one(raw.q)?.trim() || undefined,
        breed: breeds.some((b) => b.name === one(raw.breed)) ? one(raw.breed) : undefined,
        source: fromParam(SOURCE_PARAM, one(raw.source)),
        followUp,
        // The board shows every pipeline stage as a column; the stage filter (incl. Lost) is list-only.
        stage: view === "list" ? fromParam(STAGE_PARAM, one(raw.stage)) : undefined,
    };
    const filtered = Boolean(filters.q || filters.breed || filters.source || filters.followUp || filters.stage);
    const ctx = { t, tTime, format, today, now: new Date() };

    const hrefWith = (changes: Record<string, string | undefined>) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && key !== "notice" && key !== "page") params.set(key, value);
        for (const [key, value] of Object.entries(changes)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        const query = params.toString();
        return `/dashboard/leads${query ? `?${query}` : ""}`;
    };

    // Load only what the current view shows.
    const [board, table, unfiltered] = await Promise.all([
        view === "board" ? listLeadsBoard(kennel.id, filters) : null,
        view === "list" ? listLeadsTable(kennel.id, filters, { page, pageSize: TABLE_PAGE_SIZE }) : null,
        filtered ? listLeadsTable(kennel.id, {}, { page: 1, pageSize: 1 }) : null,
    ]);
    // A page past the end (old link, items removed) goes to the last page instead of looking empty.
    if (table && page > 1 && page > Math.ceil(table.total / TABLE_PAGE_SIZE)) {
        redirect({ href: hrefWith({ page: String(Math.max(1, Math.ceil(table.total / TABLE_PAGE_SIZE))) }), locale: await getLocale() });
    }
    // A board whose only matches are old sold leads still shows (its Sold column links to the list).
    const hasResults = board ? board.columns.some((column) => column.count > 0 || column.truncated) : table!.total > 0;
    const anyLeads = filtered ? unfiltered!.total > 0 : hasResults;

    const banner =
        summary.dueCount > 0
            ? {
                  title: t("banner.title", { count: summary.dueCount }),
                  names:
                      summary.names.length > 2
                          ? t("banner.namesMore", { names: summary.names.slice(0, 2).join(", "), more: summary.names.length - 2 })
                          : t("banner.names", { names: format.list(summary.names, { type: "conjunction" }), count: summary.names.length }),
              }
            : null;

    const viewLink = (value: "board" | "list") => (
        <Link
            href={hrefWith({ view: value === "board" ? undefined : "list" })}
            aria-current={view === value ? "page" : undefined}
            scroll={false}
            className={`px-4 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                view === value ? "bg-accent-soft font-semibold text-accent" : "font-medium text-stone-600 hover:bg-stone-50"
            }`}
        >
            {t(`view.${value}`)}
        </Link>
    );

    return (
        <>
            <PageHeader title={t("list.title")} subtitle={t("list.subtitle")} actions={<Button href="/dashboard/leads/new">{t("list.addLead")}</Button>} />

            {(one(raw.notice) === "created" || one(raw.notice) === "deleted") && (
                <Notice tone="success" clearParam="notice" className="mb-5">
                    {t(`notices.${one(raw.notice) as "created" | "deleted"}`)}
                </Notice>
            )}

            {banner && (
                <Link
                    href={hrefWith({ followUp: "due" })}
                    className="mb-5 flex items-start gap-3 rounded-xl border border-status-amber-bg bg-status-amber-bg px-4 py-3 text-sm text-status-amber transition-colors hover:border-status-amber-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    <Clock className="mt-0.5 size-4.5 shrink-0" aria-hidden />
                    <span>
                        <strong className="font-semibold">{banner.title}</strong> {banner.names} <span className="underline">{t("banner.show")}</span>
                    </span>
                </Link>
            )}

            {!anyLeads ? (
                <EmptyState
                    title={t("empty.all.title")}
                    description={t("empty.all.description")}
                    action={<Button href="/dashboard/leads/new">{t("empty.all.cta")}</Button>}
                />
            ) : (
                <>
                    <UrlFilters
                        searchLabel={t("filters.searchLabel")}
                        searchPlaceholder={t("filters.searchPlaceholder")}
                        selects={[
                            { param: "breed", label: t("filters.breedLabel"), allLabel: t("filters.allBreeds"), options: breeds.map((b) => ({ value: b.name, label: b.name })) },
                            {
                                param: "source",
                                label: t("filters.sourceLabel"),
                                allLabel: t("filters.allSources"),
                                options: LEAD_SOURCES.map((source) => ({ value: SOURCE_PARAM[source], label: t(`sources.${source}`) })),
                            },
                            {
                                param: "followUp",
                                label: t("filters.followUpLabel"),
                                allLabel: t("filters.anyFollowUp"),
                                options: FOLLOW_UP_PARAMS.map((value) => ({ value, label: t(`filters.followUp.${value}`) })),
                            },
                            ...(view === "list"
                                ? [
                                      {
                                          param: "stage",
                                          label: t("filters.stageLabel"),
                                          allLabel: t("filters.anyStage"),
                                          options: [...LEAD_STAGE_ORDER, "LOST" as const].map((stage) => ({ value: STAGE_PARAM[stage], label: t(`stages.${stage}`) })),
                                      },
                                  ]
                                : []),
                        ]}
                    >
                        <nav aria-label={t("view.label")} className="flex overflow-hidden rounded-xl border border-line-strong bg-white">
                            {viewLink("board")}
                            {viewLink("list")}
                        </nav>
                    </UrlFilters>

                    {!hasResults ? (
                        <EmptyState
                            title={t("empty.filtered.title")}
                            description={t("empty.filtered.description")}
                            action={
                                <Button href={view === "list" ? "/dashboard/leads?view=list" : "/dashboard/leads"} variant="secondary">
                                    {t("empty.filtered.clear")}
                                </Button>
                            }
                        />
                    ) : board ? (
                        <LeadBoard
                            columns={board.columns.map((column) => ({ ...column, cards: column.cards.map((card) => toLeadCardView(card, ctx)) }))}
                            olderSoldHref={hrefWith({ view: "list" })}
                        />
                    ) : (
                        <LeadsTable
                            showReason={filters.stage === "LOST"}
                            items={table!.items.map((card) => toLeadCardView(card, ctx))}
                            total={table!.total}
                            previousHref={page > 1 ? hrefWith({ view: "list", page: String(page - 1) }) : null}
                            nextHref={page * TABLE_PAGE_SIZE < table!.total ? hrefWith({ view: "list", page: String(page + 1) }) : null}
                        />
                    )}
                </>
            )}
        </>
    );
}
