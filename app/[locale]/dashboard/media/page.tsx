import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getMediaCounts, getMediaFilterOptions, listMedia } from "@/lib/dashboard/media";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import PageLink from "@/components/dashboard/ui/PageLink";
import Notice from "@/components/dashboard/ui/Notice";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import UrlFilters from "@/components/dashboard/ui/UrlFilters";
import PhotoGrid from "@/components/dashboard/media/PhotoGrid";
import UploadArea from "@/components/dashboard/media/UploadArea";
import VideoGrid from "@/components/dashboard/media/VideoGrid";

const PAGE_SIZE = 24;

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.media");
    return { title: t("title") };
}

type SearchParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/** Kennel gallery: Photos / Videos tabs, breed and dog filters, page: all in the URL. */
export default async function MediaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const raw = await searchParams;
    const type = one(raw.type) === "videos" ? "VIDEO" : "PHOTO";
    const page = Math.max(1, Number.parseInt(one(raw.page) ?? "1", 10) || 1);

    const [t, options, counts] = await Promise.all([getTranslations("dashboard.media"), getMediaFilterOptions(kennel.id), getMediaCounts(kennel.id)]);
    const breed = options.breeds.some((b) => b.name === one(raw.breed)) ? one(raw.breed) : undefined;
    const dog = options.dogs.find((d) => d.id === one(raw.dog) && (!breed || d.breed === breed));
    const filtered = Boolean(breed || dog);
    const result = await listMedia(kennel.id, { type, breed, dogId: dog?.id, page, pageSize: type === "PHOTO" ? PAGE_SIZE : 100 });

    const hrefWith = (changes: Record<string, string | undefined>) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && key !== "page") params.set(key, value);
        for (const [key, value] of Object.entries(changes)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        const query = params.toString();
        return `/dashboard/media${query ? `?${query}` : ""}`;
    };

    const tabs = [
        { key: "PHOTO", param: undefined, label: t("tabs.photos"), count: counts.photos },
        { key: "VIDEO", param: "videos", label: t("tabs.videos"), count: counts.videos },
    ] as const;
    const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
    // A page past the end (old link, items removed) goes to the last page instead of looking empty.
    if (page > lastPage) redirect({ href: hrefWith({ page: String(lastPage) }), locale: await getLocale() });
    const notice = one(raw.notice);
    const added = Math.max(1, Number.parseInt(one(raw.added) ?? "1", 10) || 1);

    return (
        <>
            <PageHeader title={t("title")} subtitle={t("subtitle")} actions={<UploadArea variant="button" />} />
            {notice === "photosAdded" && (
                <Notice tone="success" clearParam={["notice", "added"]} className="mb-5">
                    {t("upload.saved", { count: added })}
                </Notice>
            )}
            {notice === "photosFailed" && (
                <Notice tone="error" clearParam="notice" className="mb-5">
                    {t("upload.failed")}
                </Notice>
            )}
            <UploadArea variant="area" />

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <nav aria-label={t("tabs.label")}>
                    <ul className="flex gap-2">
                        {tabs.map((tab) => {
                            const active = tab.key === type;
                            return (
                                <li key={tab.key}>
                                    <Link
                                        href={hrefWith({ type: tab.param })}
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
                    className="mb-0"
                    selects={[
                        {
                            param: "breed",
                            label: t("filters.breed"),
                            allLabel: t("tags.allBreeds"),
                            options: options.breeds.map((b) => ({ value: b.name, label: b.name })),
                            resets: ["dog"],
                            className: "flex-[1_1_160px] sm:flex-none",
                        },
                        {
                            param: "dog",
                            label: t("filters.dog"),
                            allLabel: t("filters.allDogs"),
                            options: options.dogs.filter((d) => !breed || d.breed === breed).map((d) => ({ value: d.id, label: d.name })),
                            className: "flex-[1_1_160px] sm:flex-none",
                        },
                    ]}
                />
            </div>

            {type === "PHOTO" ? (
                counts.photos === 0 ? (
                    <EmptyState title={t("empty.photos")} description={t("empty.photosHelp")} />
                ) : result.items.length === 0 ? (
                    <EmptyState
                        title={t("empty.filtered")}
                        description={t("empty.filteredHelp")}
                        action={
                            <Link href={hrefWith({ breed: undefined, dog: undefined })} className="text-sm font-semibold text-accent hover:underline">
                                {t("empty.clear")}
                            </Link>
                        }
                    />
                ) : (
                    <>
                        {filtered && <p className="mb-4 text-[13px] text-stone-500">{t("photo.dragDisabled")}</p>}
                        <PhotoGrid items={result.items} totalPhotos={counts.photos} canDrag={!filtered} options={options} />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[13px] text-stone-500" aria-live="polite">
                                {t("showing", { shown: result.items.length, total: result.total })}
                            </p>
                            <nav aria-label={t("pagination")} className="flex gap-2">
                                <PageLink href={page > 1 ? hrefWith({ page: String(page - 1) }) : null} label={t("previous")} />
                                <PageLink href={page < lastPage ? hrefWith({ page: String(page + 1) }) : null} label={t("next")} />
                            </nav>
                        </div>
                    </>
                )
            ) : (
                <VideoGrid items={result.items} options={options} filtered={filtered} />
            )}
        </>
    );
}
