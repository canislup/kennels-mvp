import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import KennelFilterBar from "@/components/KennelFilterBar";
import KennelCard from "@/components/KennelCard";

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

type KennelsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    breed?: string;
    sort?: string;
    hasLitters?: string;
  }>;
};

export default async function KennelsPage({ searchParams }: KennelsPageProps) {
  const params = await searchParams;
  const t = await getTranslations("public.kennels");

  const breed = params.breed?.trim();
  const hasLitters = params.hasLitters === "true";
  const sort = params.sort === "newest" ? "newest" : "prestige";

  const [kennels, breeds] = await Promise.all([
    prisma.kennel.findMany({
      // AND so the breed and litter filters combine instead of the second
      // `dogs` key overwriting the first.
      where: {
        AND: [
          ...(breed
            ? [{ dogs: { some: { breed: { equals: breed, mode: "insensitive" as const } } } }]
            : []),
          ...(hasLitters
            ? [{ dogs: { some: { status: "AVAILABLE_PUPPY" as const } } }]
            : []),
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        location: true,
        city: true,
        state: true,
        prestigeScore: true,
        dogs: {
          select: { photoUrls: true, status: true },
        },
      },
      orderBy:
          sort === "newest"
              ? { createdAt: "desc" }
              : { prestigeScore: "desc" },
    }),
    prisma.breed.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
      <main className="min-h-screen bg-slate-50">
        <Suspense fallback={<div className="h-17 border-b border-slate-200 bg-white" />}>
          <KennelFilterBar breeds={breeds} />
        </Suspense>

        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {breed ? t("heading.breed", { breed }) : t("heading.all")}
            </h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">
              {t("count", { count: kennels.length })}
            </p>
          </div>

          {kennels.length === 0 ? (
              <EmptyState breed={breed} />
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {kennels.map((kennel) => (
                    <KennelCard key={kennel.id} kennel={kennel} />
                ))}
              </div>
          )}
        </div>
      </main>
  );
}

async function EmptyState({ breed }: { breed?: string }) {
  const t = await getTranslations("public.kennels.emptyState");

  return (
      <div className="text-center py-24 px-6 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <SearchX className="text-indigo-600" size={26} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          {breed ? t("headingBreed", { breed }) : t("heading")}
        </h3>
        <p className="text-slate-500 font-medium mt-1 max-w-sm mx-auto">
          {t("description")}
        </p>
        <Link
            href="/kennels"
            className="inline-flex mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-full transition-colors"
        >
          {t("cta")}
        </Link>
      </div>
  );
}
