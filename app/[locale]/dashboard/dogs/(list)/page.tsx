import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getDogStatusCounts, getKennelBreeds, listDogs } from "@/lib/dashboard/dogs";
import type { DogStatus, DogStatusCounts } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Notice from "@/components/dashboard/ui/Notice";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import DogCard from "@/components/dashboard/dogs/DogCard";
import UrlFilters from "@/components/dashboard/ui/UrlFilters";
import { SEX_PARAM, STAGE_PARAM, STATUS_ORDER, STATUS_PARAM, fromParam } from "@/components/dashboard/dogs/dogMeta";

const PAGE_SIZE = 12;
const NOTICES = ["created", "archived", "deleted", "restored"] as const;
const ARCHIVED_PARAM = "archived";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.dogs.list");
    return { title: t("title") };
}

type SearchParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

const COUNT_KEY: Record<DogStatus, keyof DogStatusCounts> = {
    BREEDING_STOCK: "breedingStock",
    AVAILABLE_PUPPY: "availablePuppy",
    RESERVED: "reserved",
    SOLD: "sold",
};

export default async function DogsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();

    const raw = await searchParams;
    const archived = one(raw.status) === ARCHIVED_PARAM;
    const status = archived ? undefined : fromParam(STATUS_PARAM, one(raw.status));
    const sex = fromParam(SEX_PARAM, one(raw.sex));
    const stage = fromParam(STAGE_PARAM, one(raw.stage));
    const q = one(raw.q)?.trim() || undefined;
    const breedParam = one(raw.breed) || undefined;
    const page = Math.max(1, Number.parseInt(one(raw.page) ?? "1", 10) || 1);
    const notice = NOTICES.find((n) => n === one(raw.notice));

    const [t, breeds, counts] = await Promise.all([getTranslations("dashboard"), getKennelBreeds(kennel.id), getDogStatusCounts(kennel.id)]);
    const breed = breeds.some((b) => b.name === breedParam) ? breedParam : undefined;
    const result = await listDogs(kennel.id, { status, archived, q, breed, sex, stage, page, pageSize: PAGE_SIZE });
    const filtered = Boolean(status || archived || q || breed || sex || stage);
    const now = new Date();

    // Links keep every other param, reset the page unless told otherwise.
    const hrefWith = (changes: Record<string, string | undefined>) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(raw)) {
            if (typeof value === "string" && key !== "page" && key !== "notice") params.set(key, value);
        }
        for (const [key, value] of Object.entries(changes)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        const query = params.toString();
        return query ? `/dashboard/dogs?${query}` : "/dashboard/dogs";
    };

    const tabs = [
        { key: "all", label: t("dogs.list.tabs.all"), count: counts.all, param: undefined as string | undefined, active: !status && !archived },
        ...STATUS_ORDER.map((s) => ({ key: s, label: t(`dogs.list.tabs.${s}`), count: counts[COUNT_KEY[s]], param: STATUS_PARAM[s], active: s === status })),
        { key: "archived", label: t("dogs.list.tabs.archived"), count: counts.archived, param: ARCHIVED_PARAM, active: archived },
    ];

    const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
    const hasPrevious = page > 1;
    const hasNext = page < lastPage;

    return (
        <>
            <PageHeader title={t("dogs.list.title")} subtitle={t("dogs.list.subtitle")} actions={<Button href="/dashboard/dogs/new">{t("dogs.list.addDog")}</Button>} />

            {notice && (
                <Notice tone="success" clearParam="notice" className="mb-5">
                    {t(`dogs.notices.${notice}`)}
                </Notice>
            )}

            {counts.all === 0 && counts.archived === 0 ? (
                <EmptyState
                    title={t("dogs.list.emptyRoster.title")}
                    description={t("dogs.list.emptyRoster.description")}
                    action={<Button href="/dashboard/dogs/new">{t("dogs.list.emptyRoster.cta")}</Button>}
                />
            ) : (
                <>
                    <nav aria-label={t("dogs.list.tabsLabel")} className="mb-4">
                        <ul className="flex flex-wrap gap-2">
                            {tabs.map((tab) => {
                                const active = tab.active;
                                return (
                                    <li key={tab.key}>
                                        <Link
                                            href={hrefWith({ status: tab.param })}
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

                    <UrlFilters
                        searchLabel={t("dogs.list.filters.searchLabel")}
                        searchPlaceholder={t("dogs.list.filters.searchPlaceholder")}
                        selects={[
                            {
                                param: "breed",
                                label: t("dogs.list.filters.breedLabel"),
                                allLabel: t("dogs.list.filters.allBreeds"),
                                options: breeds.map((b) => ({ value: b.name, label: b.name })),
                                className: "flex-[1_1_160px] sm:flex-none",
                            },
                            {
                                param: "sex",
                                label: t("dogs.list.filters.sexLabel"),
                                allLabel: t("dogs.list.filters.anySex"),
                                options: [
                                    { value: "male", label: t("dogs.list.filters.male") },
                                    { value: "female", label: t("dogs.list.filters.female") },
                                ],
                                className: "flex-[1_1_120px] sm:flex-none",
                            },
                            {
                                param: "stage",
                                label: t("dogs.list.filters.stageLabel"),
                                allLabel: t("dogs.list.filters.anyStage"),
                                options: [
                                    { value: "puppy", label: t("dogs.list.filters.puppy") },
                                    { value: "adult", label: t("dogs.list.filters.adult") },
                                ],
                                className: "flex-[1_1_140px] sm:flex-none",
                            },
                        ]}
                    />

                    {result.items.length === 0 && archived && !(q || breed || sex || stage) ? (
                        <EmptyState title={t("dogs.list.emptyArchived.title")} description={t("dogs.list.emptyArchived.description")} />
                    ) : result.items.length === 0 ? (
                        <EmptyState
                            title={t("dogs.list.emptyFiltered.title")}
                            description={t("dogs.list.emptyFiltered.description")}
                            action={
                                <Button href="/dashboard/dogs" variant="secondary">
                                    {t("dogs.list.emptyFiltered.clear")}
                                </Button>
                            }
                        />
                    ) : (
                        <>
                            <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
                                {result.items.map((dog) => (
                                    <li key={dog.id} className="grid">
                                        <DogCard dog={dog} now={now} />
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-[13px] text-stone-500" aria-live="polite">
                                    {t("dogs.list.showing", { shown: result.items.length, total: result.total })}
                                    {filtered && <span className="sr-only"> {t("dogs.list.filteredNote")}</span>}
                                </p>
                                <nav aria-label={t("dogs.list.paginationLabel")} className="flex gap-2">
                                    <PageLink href={hasPrevious ? hrefWith({ page: String(page - 1) }) : null} label={t("dogs.list.previous")} />
                                    <PageLink href={hasNext ? hrefWith({ page: String(page + 1) }) : null} label={t("dogs.list.next")} />
                                </nav>
                            </div>
                        </>
                    )}
                </>
            )}
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
