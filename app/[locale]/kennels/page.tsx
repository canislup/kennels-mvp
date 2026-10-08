import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { parseKennelSearch, searchKennels } from "@/lib/kennel-search";
import { publicFontClasses } from "@/lib/fonts";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import KennelSearchForm from "@/components/KennelSearchForm";
import KennelFilterBar from "@/components/KennelFilterBar";
import SaveSearchBanner from "@/components/SaveSearchBanner";
import KennelCard from "@/components/KennelCard";
import InfiniteKennelList from "@/components/InfiniteKennelList";
import KennelEmptyState from "@/components/KennelEmptyState";

type KennelsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: Pick<KennelsPageProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.kennels.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function KennelsPage({ searchParams }: KennelsPageProps) {
  const rawParams = await searchParams;
  const filters = parseKennelSearch(rawParams);
  const t = await getTranslations("public.kennels");

  const [{ kennels, total, hasMore }, breeds] = await Promise.all([
    searchKennels(filters),
    prisma.breed.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const { breed, location } = filters;
  const heading =
      breed && location
          ? t("header.headingBreedLocation", { breed, location })
          : breed
              ? t("header.headingBreed", { breed })
              : location
                  ? t("header.headingLocation", { location })
                  : t("header.headingAll");

  // Same filters the API route will parse for page 2+. Also keys the
  // infinite list so it resets whenever the search changes.
  const query = new URLSearchParams(
      Object.entries(rawParams).flatMap(([key, value]) =>
          typeof value === "string" && key !== "page" ? [[key, value]] : [],
      ),
  ).toString();

  return (
      <div className={`${publicFontClasses} flex min-h-screen flex-col bg-white text-[#1C1917]`}>
        <SiteHeader variant="solid" active="browse" />

        <main className="flex-1">
          <section className="border-b border-[#E7E2DA]">
            <div className="mx-auto max-w-360 px-4.5 py-4 sm:px-8 sm:py-7 lg:px-16">
              <div className="mb-3 sm:mb-4.5">
                <div className="mb-1 text-xs font-semibold text-[#4F46E5] uppercase sm:mb-1.5 sm:text-[13px] sm:tracking-[0.5px]">
                  {t("header.count", { count: total })}
                </div>
                <h1 className="font-(family-name:--font-playfair) text-[19px] font-bold sm:text-[28px]">{heading}</h1>
              </div>
              <KennelSearchForm breeds={breeds} />
            </div>
          </section>

          <KennelFilterBar breeds={breeds} />

          <div className="mx-auto max-w-360 px-4.5 pb-16 sm:px-8 sm:pb-24 lg:px-16">
            {kennels.length === 0 ? (
                <div className="mt-6 sm:mt-7">
                  <KennelEmptyState breed={breed} location={location} />
                </div>
            ) : (
                <>
                  <div className="mt-2 sm:mt-3">
                    <SaveSearchBanner />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4.5 sm:mt-3 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
                    {kennels.map((kennel, i) => (
                        <KennelCard
                            key={kennel.id}
                            kennel={kennel}
                            // Static visual from the design; only meaningful on prestige order.
                            eyebrow={i === 0 && filters.sort === "prestige" ? t("card.topRated") : undefined}
                        />
                    ))}
                  </div>

                  <InfiniteKennelList key={query} query={query} initialHasMore={hasMore} />
                </>
            )}
          </div>
        </main>

        <SiteFooter variant="dark" />
      </div>
  );
}
