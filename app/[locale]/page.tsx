import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Award,
  Check,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getFeaturedKennels, type KennelCardData } from "@/lib/kennel-search";
import { publicFontClasses } from "@/lib/fonts";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HomeSearchForm from "@/components/HomeSearchForm";

type HomeProps = {
  params: Promise<{ locale: string }>;
};

// Breed names are database content (not translated); these match Breed rows.
const POPULAR_BREEDS = [
  "Labrador Retriever",
  "French Bulldog",
  "Doberman Pinscher",
  "Shih Tzu",
];

// Card image fallbacks from the design, used when a kennel has no dog photos.
const CARD_FALLBACK_COLORS = ["bg-[#E8DFCB]", "bg-[#D8CFC4]", "bg-[#CFC2B4]"];

export async function generateMetadata({
  params,
}: HomeProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "public.home.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

export default async function Home() {
  const t = await getTranslations("public.home");

  const [breeds, featured] = await Promise.all([
    prisma.breed.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getFeaturedKennels(3),
  ]);

  const trust = [
    { key: "verified", Icon: ShieldCheck },
    { key: "reputation", Icon: Award },
    { key: "records", Icon: CreditCard },
  ] as const;

  return (
    <div
      className={`${publicFontClasses} flex min-h-screen flex-col bg-white text-[#1C1917]`}
    >
      {/* HERO — full-bleed photo with the nav floating over it */}
      <div className="relative isolate flex shrink-0 flex-col">
        <Image
          src="/images/hero-puppy.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[center_35%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-b from-[rgba(17,15,13,0.22)] via-[rgba(17,15,13,0.38)] via-55% to-[rgba(17,15,13,0.58)]"
        />

        <SiteHeader variant="overlay" />

        <section className="mx-auto flex w-full max-w-360 flex-col items-center px-4.5 pt-12 pb-20 text-center sm:px-8 sm:pt-18 sm:pb-30 lg:px-16">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/16 px-4 py-2 text-[13px] font-semibold tracking-[0.02em] text-white uppercase">
            <Check size={14} strokeWidth={2.5} aria-hidden />
            {t("hero.badge")}
          </div>
          <h1 className="max-w-225 font-(family-name:--font-playfair) text-[40px] leading-[1.08] font-semibold tracking-[-0.015em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.25)] sm:text-[56px] lg:text-[68px]">
            {t("hero.heading")}
          </h1>
          <p className="mt-7 max-w-155 text-[17px] leading-[1.6] text-white/88 sm:text-[19px]">
            {t("hero.subheading")}
          </p>

          <HomeSearchForm breeds={breeds} />

          <div className="mt-5.5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
            <span className="text-sm text-white/75">{t("popular.label")}</span>
            {POPULAR_BREEDS.map((breed) => (
              <Link
                key={breed}
                href={{ pathname: "/kennels", query: { breed } }}
                className="border-b border-white/45 text-sm font-medium text-white/92 hover:text-white"
              >
                {breed}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <main className="mx-auto w-full max-w-360 mt-15">
        {/* TRUST SIGNALS */}
        <section className="px-4.5 pb-16 sm:px-8 sm:pb-24 lg:px-16">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-8">
            {trust.map(({ key, Icon }) => (
              <div
                key={key}
                className="rounded-[20px] border border-[#E7E2DA] bg-white p-7 sm:p-9"
              >
                <Icon
                  size={26}
                  strokeWidth={1.8}
                  className="text-[#4F46E5]"
                  aria-hidden
                />
                <h3 className="mt-5 font-(family-name:--font-playfair) text-xl font-semibold">
                  {t(`trust.${key}.title`)}
                </h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-[#57534E]">
                  {t(`trust.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURED KENNELS */}
        {featured.length > 0 && (
          <section className="px-4.5 pb-16 sm:px-8 sm:pb-25 lg:px-16">
            <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-(family-name:--font-playfair) text-[26px] font-semibold sm:text-[32px]">
                {t("featured.heading")}
              </h2>
              <Link
                href="/kennels"
                className="flex items-center gap-1.5 text-[15px] font-semibold text-[#292524] hover:text-[#4F46E5]"
              >
                {t("featured.browseAll")}
                <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
              {featured.map((kennel, i) => (
                <FeaturedKennelCard
                  key={kennel.id}
                  kennel={kennel}
                  fallbackColor={
                    CARD_FALLBACK_COLORS[i % CARD_FALLBACK_COLORS.length]
                  }
                  labels={{
                    puppies: t("featured.puppiesAvailable"),
                    prestige: t("featured.prestige", {
                      score: kennel.prestigeScore,
                    }),
                    photoAlt: t("featured.photoAlt", { name: kennel.name }),
                    locationUnavailable: t("featured.locationUnavailable"),
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* BREEDER CTA */}
        <section className="px-4.5 pb-16 sm:px-8 sm:pb-24 lg:px-16">
          <div className="flex flex-col items-start justify-between gap-8 rounded-[28px] bg-[#1C1917] px-7 py-10 sm:px-18 sm:py-16 lg:flex-row lg:items-center lg:gap-12">
            <div className="max-w-140">
              <h2 className="font-(family-name:--font-playfair) text-[28px] font-semibold text-[#FBF9F6] sm:text-[34px]">
                {t("cta.heading")}
              </h2>
              <p className="mt-4.5 text-base leading-[1.6] text-[#D6D3D1]">
                {t("cta.description")}
              </p>
            </div>
            <Link
              href="/signup"
              className="flex shrink-0 items-center gap-2.5 rounded-full bg-[#FBF9F6] px-8 py-4.5 text-base font-semibold text-[#1C1917]"
            >
              {t("cta.button")}
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter variant="light" />
    </div>
  );
}

// Home.html's card: simpler than the directory card (no verified badge,
// text prestige pill, Work Sans title).
function FeaturedKennelCard({
  kennel,
  fallbackColor,
  labels,
}: {
  kennel: KennelCardData;
  fallbackColor: string;
  labels: {
    puppies: string;
    prestige: string;
    photoAlt: string;
    locationUnavailable: string;
  };
}) {
  const meta = [kennel.location || labels.locationUnavailable, kennel.breed]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/kennel/${kennel.slug}`}
      className="block overflow-hidden rounded-[20px] border border-[#E7E2DA] bg-white text-[#1C1917]"
    >
      <div className={`relative h-52.5 ${fallbackColor}`}>
        {kennel.photoUrl && (
          <img
            src={kennel.photoUrl}
            alt={labels.photoAlt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        {kennel.hasPuppies && (
          <span className="absolute top-4 left-4 rounded-full bg-[#166534] px-3 py-1.5 text-xs font-semibold text-white">
            {labels.puppies}
          </span>
        )}
      </div>
      <div className="p-5.5">
        <h3 className="text-[19px] font-semibold">{kennel.name}</h3>
        <p className="mt-1.5 text-sm text-[#78716C]">{meta}</p>
        <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-2.75 py-1.25 text-xs font-semibold text-[#92400E]">
          {labels.prestige}
        </span>
      </div>
    </Link>
  );
}
