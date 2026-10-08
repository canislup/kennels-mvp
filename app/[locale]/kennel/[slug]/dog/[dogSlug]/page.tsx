import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { publicFontClasses } from "@/lib/fonts";
import { dogAge } from "@/lib/dog-age";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type DogPageProps = {
    params: Promise<{ locale: string; slug: string; dogSlug: string }>;
};

// Placeholder tile colors from the design, shown behind/instead of images.
const TILE_GRADIENTS = [
    "bg-linear-135 from-[#F0DCA8] to-[#DDB877]",
    "bg-linear-135 from-[#E7CFA0] to-[#C9A063]",
    "bg-linear-135 from-[#F3E2B8] to-[#E0C08A]",
    "bg-linear-135 from-[#D4B896] to-[#B89574]",
];

const MAX_PHOTOS = 8;

// Dog slugs are only unique per kennel, so the lookup goes through the
// kennel's slug. Sold dogs are hidden from the public roster, so their pages
// 404 too. cache() shares the query with generateMetadata.
const getDog = cache(async (kennelSlug: string, dogSlug: string) =>
    prisma.dog.findFirst({
        where: { slug: dogSlug, kennel: { slug: kennelSlug }, status: { not: "SOLD" } },
        select: {
            name: true,
            breed: true,
            gender: true,
            lifeStage: true,
            birthDate: true,
            registry: true,
            lineage: true,
            bio: true,
            sireName: true,
            damName: true,
            photoUrls: true,
            media: {
                where: { type: "PHOTO" },
                orderBy: { createdAt: "asc" },
                take: MAX_PHOTOS,
                select: { id: true, url: true },
            },
            kennel: { select: { name: true, slug: true } },
        },
    }),
);

function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h2 className="mb-3.5 font-(family-name:--font-playfair) text-xl font-bold text-[#1C1917]">{children}</h2>;
}

export async function generateMetadata({ params }: DogPageProps): Promise<Metadata> {
    const { locale, slug, dogSlug } = await params;
    const [dog, t] = await Promise.all([getDog(slug, dogSlug), getTranslations({ locale, namespace: "public.dog" })]);

    if (!dog) {
        return { title: t("metadata.notFound") };
    }

    const title = t("metadata.title", { name: dog.name, kennel: dog.kennel.name });
    const description =
        dog.bio?.slice(0, 155) || t("metadata.fallbackDescription", { name: dog.name, breed: dog.breed, kennel: dog.kennel.name });
    const image = dog.photoUrls[0] ?? dog.media[0]?.url;

    return {
        title,
        description,
        openGraph: { title, description, images: image ? [image] : undefined },
    };
}

export default async function DogPage({ params }: DogPageProps) {
    const { slug, dogSlug } = await params;
    const [dog, t] = await Promise.all([getDog(slug, dogSlug), getTranslations("public.dog")]);

    if (!dog) {
        notFound();
    }

    const gender = dog.gender.toLowerCase();
    const sex = gender === "female" ? "female" : gender === "male" ? "male" : null;
    const role = dog.lifeStage === "PUPPY" ? t("role.puppy") : sex === "female" ? t("role.dam") : sex === "male" ? t("role.sire") : null;

    const age = dog.birthDate ? dogAge(dog.birthDate) : null;
    const meta = [
        age && t(`age.${age.unit}`, { count: age.count }),
        [dog.registry, dog.breed].filter(Boolean).join(" "),
        role,
    ].filter(Boolean);

    // Only badges backed by real fields: the free-text bloodline. Health
    // clearances (OFA etc.) have no schema yet, so none are shown.
    const titleBadges = [dog.lineage?.trim()].filter((badge): badge is string => Boolean(badge));

    const hero = dog.photoUrls[0] ?? dog.media[0]?.url ?? null;
    const parents = [
        { label: t("parentage.sire"), name: dog.sireName },
        { label: t("parentage.dam"), name: dog.damName },
    ].filter((parent) => parent.name);

    return (
        <div className={`${publicFontClasses} flex min-h-screen flex-col bg-white text-[#1C1917]`}>
            <SiteHeader variant="solid" />

            <main className="mx-auto w-full max-w-360 flex-1 px-4.5 pb-16 sm:px-8 sm:pb-20 lg:px-16">
                <nav aria-label={t("breadcrumb.label")} className="mt-6 text-[13px] text-[#78716C] sm:mt-8">
                    <Link href="/kennels" className="transition-colors hover:text-[#4F46E5]">
                        {t("breadcrumb.browse")}
                    </Link>
                    <span className="mx-2" aria-hidden>
                        /
                    </span>
                    <Link href={`/kennel/${dog.kennel.slug}`} className="transition-colors hover:text-[#4F46E5]">
                        {dog.kennel.name}
                    </Link>
                    <span className="mx-2" aria-hidden>
                        /
                    </span>
                    <span className="font-medium text-[#1C1917]" aria-current="page">
                        {dog.name}
                    </span>
                </nav>

                {/* Hero */}
                <div className="mt-5.5 h-60 overflow-hidden rounded-[20px] bg-linear-135 from-[#F0DCA8] to-[#DDB877] sm:h-90">
                    {hero && <img src={hero} alt={t("photoAlt", { name: dog.name })} className="h-full w-full object-cover" />}
                </div>

                <div className="mt-8 grid grid-cols-1 gap-x-14 gap-y-6 lg:grid-cols-[minmax(0,820fr)_436px] lg:gap-y-4.5">
                    {/* Name + meta */}
                    <div>
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                            <h1 className="font-(family-name:--font-playfair) text-[26px] leading-tight font-bold sm:text-[30px]">{dog.name}</h1>
                            {sex && (
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        sex === "female" ? "bg-[#FCE7F3] text-[#9D174D]" : "bg-[#DBEAFE] text-[#1E40AF]"
                                    }`}
                                >
                                    {t(`sex.${sex}`)}
                                </span>
                            )}
                        </div>
                        <div className="text-[15px] font-medium text-[#57534E]">
                            {meta.map((part, i) => (
                                <span key={i}>
                                    {i > 0 && (
                                        <span className="mx-2" aria-hidden>
                                            ·
                                        </span>
                                    )}
                                    {part}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Title badges */}
                    <div className="flex flex-wrap content-start gap-2 lg:justify-end">
                        {titleBadges.map((badge) => (
                            <span key={badge} className="rounded-full bg-[#FEF3C7] px-3.5 py-1.5 text-xs font-semibold text-[#92400E]">
                                {badge}
                            </span>
                        ))}
                    </div>

                    <div className="min-w-0">
                        {dog.bio && (
                            <section className="mb-8">
                                <SectionHeading>{t("about.heading", { name: dog.name })}</SectionHeading>
                                <p className="max-w-195 text-[15px] leading-[1.7] whitespace-pre-line text-[#44403C]">{dog.bio}</p>
                            </section>
                        )}

                        {dog.media.length > 0 && (
                            <section className="mb-8">
                                <SectionHeading>{t("photos.heading", { name: dog.name })}</SectionHeading>
                                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                                    {dog.media.map((photo, i) => (
                                        <div key={photo.id} className={`h-35 w-full overflow-hidden rounded-xl ${TILE_GRADIENTS[i % TILE_GRADIENTS.length]}`}>
                                            <img src={photo.url} alt={t("photoAlt", { name: dog.name })} loading="lazy" className="h-full w-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {parents.length > 0 && (
                            <section>
                                <SectionHeading>{t("parentage.heading")}</SectionHeading>
                                <div className="flex flex-col gap-4 sm:flex-row">
                                    {parents.map((parent) => (
                                        <div key={parent.label} className="flex-1 rounded-xl bg-[#F5F1EA] px-4.5 py-4">
                                            <div className="mb-1 text-[11px] font-semibold tracking-[0.4px] text-[#78716C] uppercase">{parent.label}</div>
                                            <div className="text-[15px] font-bold text-[#1C1917]">{parent.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Contact card — placeholder CTA until messaging exists. */}
                    <aside className="h-fit rounded-2xl border border-[#E7E2DA] bg-white p-7">
                        <h3 className="mb-2.5 font-(family-name:--font-playfair) text-[17px] font-bold text-[#1C1917]">
                            {t("contact.heading", { kennel: dog.kennel.name })}
                        </h3>
                        <p className="mb-5 text-sm text-[#57534E]">
                            {dog.lifeStage === "PUPPY" ? t("contact.bodyPuppy", { name: dog.name }) : t("contact.bodyAdult", { name: dog.name })}
                        </p>
                        <a
                            href="#"
                            className="mb-2.5 block rounded-[10px] bg-[#4F46E5] p-3.5 text-center text-[15px] font-semibold text-white transition-colors hover:bg-[#4338CA]"
                        >
                            {t("contact.contactKennel")}
                        </a>
                        <Link
                            href={`/kennel/${dog.kennel.slug}`}
                            className="block rounded-[10px] bg-[#F5F1EA] p-3.25 text-center text-sm font-medium text-[#44403C] transition-colors hover:bg-[#F0ECE3]"
                        >
                            {t("contact.back", { kennel: dog.kennel.name })}
                        </Link>
                    </aside>
                </div>
            </main>

            <SiteFooter variant="dark" />
        </div>
    );
}
