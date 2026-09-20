import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldCheck, Sparkles, Award, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import BreedSearchForm from "@/components/BreedSearchForm";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type HomeProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomeProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.home.metadata" });

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

  // Server-fetched breed list to populate the search dropdown.
  const breeds = await prisma.breed.findMany({
    orderBy: { name: "asc" },
  });

  return (
      <main className="min-h-screen bg-white">
        {/* TOP NAV — sits above the hero image, not on top of it */}
        <nav className="max-w-6xl mx-auto w-full flex items-center justify-between px-6 py-6">
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            Kennel<span className="text-indigo-600">OS</span>
          </span>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 text-sm font-semibold px-4 py-2.5 rounded-full transition-colors"
            >
              {t("nav.breederLogin")}
            </Link>
          </div>
        </nav>

        {/* HERO — real photo backdrop, contained in a rounded panel */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <section className="relative isolate overflow-hidden rounded-3xl max-w-7xl mx-auto h-140 sm:h-155 lg:h-170 flex flex-col items-center justify-center text-center px-6">
            <Image
                src="/images/hero-puppy.jpg"
                alt={t("hero.imageAlt")}
                fill
                priority
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover"
            />
            {/* Scrim so the headline + search bar stay legible over the photo */}
            <div className="absolute inset-0 bg-black/40" />

            <div className="relative z-10 inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-8">
              <Sparkles size={14} className="text-amber-300" />
              {t("hero.badge")}
            </div>

            <h1 className="relative z-10 text-5xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.05]">
              {t("hero.headingLine1")}
              <br className="hidden sm:block" /> {t("hero.headingLine2")}
            </h1>

            <p className="relative z-10 mt-6 text-lg sm:text-xl text-white/85 max-w-2xl">
              {t("hero.subheading")}
            </p>

            <div className="relative z-10 mt-10 w-full max-w-2xl flex justify-center">
              <BreedSearchForm breeds={breeds} />
            </div>
          </section>
        </div>

        {/* TRUST SIGNALS */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <ShieldCheck className="text-indigo-600" size={24} />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {t("trust.verified.title")}
              </h3>
              <p className="mt-2 text-slate-500 text-sm">
                {t("trust.verified.description")}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Award className="text-indigo-600" size={24} />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {t("trust.prestige.title")}
              </h3>
              <p className="mt-2 text-slate-500 text-sm">
                {t("trust.prestige.description")}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Sparkles className="text-indigo-600" size={24} />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {t("trust.profiles.title")}
              </h3>
              <p className="mt-2 text-slate-500 text-sm">
                {t("trust.profiles.description")}
              </p>
            </div>
          </div>
        </section>

        {/* BREEDER CTA — secondary banner, below the fold */}
        <section className="bg-slate-50 border-t border-slate-100">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 sm:px-14 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

              <div className="relative z-10 text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {t("cta.heading")}
                </h2>
                <p className="mt-3 text-slate-300 max-w-xl">
                  {t("cta.description")}
                </p>
              </div>

              <Link
                  href="/signup"
                  className="relative z-10 inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-semibold px-7 py-3.5 rounded-full shadow-md transition-colors whitespace-nowrap"
              >
                {t("cta.button")}
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
  );
}
