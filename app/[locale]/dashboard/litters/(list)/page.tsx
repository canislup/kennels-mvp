import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getLinkablePuppies, getLitterDetail, getLitterStatusCounts, getLitterWaitlist, listLitters } from "@/lib/dashboard/litters";
import type { LitterStatus } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Notice from "@/components/dashboard/ui/Notice";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import LitterCard from "@/components/dashboard/litters/LitterCard";
import LitterDetailPanel from "@/components/dashboard/litters/LitterDetailPanel";
import { LITTER_COUNT_KEY, LITTER_DETAIL_ID, LITTER_LIST_ID, LITTER_STATUS_ORDER, LITTER_STATUS_PARAM } from "@/components/dashboard/litters/litterMeta";
import { fromParam } from "@/components/dashboard/dogs/dogMeta";

const NOTICES = ["created", "deleted", "puppyAdded"] as const;

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.litters.list");
    return { title: t("title") };
}

type SearchParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/**
 * Master-detail: the status tab (`?status=`) filters the list, the selected
 * litter (`?litter=`) drives the detail. Both live in the URL.
 */
export default async function LittersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();

    const raw = await searchParams;
    const status = fromParam(LITTER_STATUS_PARAM, one(raw.status));
    const notice = NOTICES.find((n) => n === one(raw.notice));

    const [t, counts, litters] = await Promise.all([getTranslations("dashboard.litters"), getLitterStatusCounts(kennel.id), listLitters(kennel.id, { status })]);

    // Unknown or filtered-out selection falls back to the first litter in the list.
    const selected = litters.find((litter) => litter.id === one(raw.litter)) ?? litters[0];
    const [detail, waitlist, linkable] = selected
        ? await Promise.all([getLitterDetail(kennel.id, selected.id), getLitterWaitlist(kennel.id, selected.id), getLinkablePuppies(kennel.id, selected.id)])
        : [null, [], []];

    const hrefWith = (changes: Record<string, string | undefined>, hash = "") => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && key !== "notice") params.set(key, value);
        for (const [key, value] of Object.entries(changes)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        const query = params.toString();
        return `/dashboard/litters${query ? `?${query}` : ""}${hash}`;
    };

    const tabs = [
        { key: "all", label: t("list.tabs.all"), count: counts.all, value: undefined as LitterStatus | undefined },
        ...LITTER_STATUS_ORDER.map((s) => ({ key: s, label: t(`list.tabs.${s}`), count: counts[LITTER_COUNT_KEY[s]], value: s })),
    ];

    return (
        <>
            <PageHeader title={t("list.title")} subtitle={t("list.subtitle")} actions={<Button href="/dashboard/litters/new">{t("list.newLitter")}</Button>} />

            {notice && (
                <Notice tone="success" clearParam="notice" className="mb-5">
                    {t(`notices.${notice}`)}
                </Notice>
            )}

            {counts.all === 0 ? (
                <EmptyState
                    title={t("list.emptyAll.title")}
                    description={t("list.emptyAll.description")}
                    action={<Button href="/dashboard/litters/new">{t("list.emptyAll.cta")}</Button>}
                />
            ) : (
                <>
                    <nav aria-label={t("list.tabsLabel")} className="mb-6">
                        <ul className="flex flex-wrap gap-2">
                            {tabs.map((tab) => {
                                const active = tab.value === status;
                                return (
                                    <li key={tab.key}>
                                        <Link
                                            // A new tab starts with its own first litter selected.
                                            href={hrefWith({ status: tab.value && LITTER_STATUS_PARAM[tab.value], litter: undefined })}
                                            aria-current={active ? "page" : undefined}
                                            scroll={false}
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                                                active ? "border-stone-900 bg-stone-900 text-stone-50" : "border-line-strong bg-white text-stone-700 hover:bg-stone-50"
                                            }`}
                                        >
                                            {tab.label}
                                            <span className="font-medium opacity-70">{tab.count}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {litters.length === 0 ? (
                        <EmptyState
                            title={t("list.emptyTab.title", { status: status ? t(`list.tabs.${status}`) : "" })}
                            description={t("list.emptyTab.description")}
                            action={
                                <Button href="/dashboard/litters" variant="secondary">
                                    {t("list.emptyTab.showAll")}
                                </Button>
                            }
                        />
                    ) : (
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                            <ul id={LITTER_LIST_ID} aria-label={t("list.listLabel")} className="flex scroll-mt-20 flex-col gap-3.5 lg:w-[38%] lg:min-w-80 lg:shrink-0">
                                {litters.map((litter) => (
                                    <li key={litter.id}>
                                        <LitterCard
                                            litter={litter}
                                            selected={litter.id === selected?.id}
                                            href={hrefWith({ litter: litter.id }, `#${LITTER_DETAIL_ID}`)}
                                        />
                                    </li>
                                ))}
                            </ul>
                            <div className="min-w-0 flex-1">{detail && <LitterDetailPanel litter={detail} waitlist={waitlist} linkable={linkable} />}</div>
                        </div>
                    )}
                </>
            )}
        </>
    );
}
