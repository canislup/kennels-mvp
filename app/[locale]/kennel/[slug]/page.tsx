import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { CalendarDays, Clock, Mail, MapPin, PawPrint } from "lucide-react";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { publicFontClasses } from "@/lib/fonts";
import { slugify } from "@/lib/slug";
import { isSameBreed } from "@/lib/breeds";
import { dogAge } from "@/lib/dog-age";
import { getFeaturedKennels } from "@/lib/kennel-search";
import { PLACEHOLDER_RATING, PLACEHOLDER_REVIEWS } from "@/lib/placeholder-reviews";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import KennelShareButton from "@/components/KennelShareButton";
import ProfileVideoTile from "@/components/ProfileVideoTile";
import KennelDogRoster, { type RosterDog } from "@/components/KennelDogRoster";

type KennelProfilePageProps = {
    params: Promise<{ locale: string; slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Placeholder tile colors from the design, used when there's no image.
const TILE_GRADIENTS = [
    "bg-linear-135 from-[#F0DCA8] to-[#DDB877]",
    "bg-linear-135 from-[#E7CFA0] to-[#C9A063]",
    "bg-linear-135 from-[#F3E2B8] to-[#E0C08A]",
    "bg-linear-135 from-[#D4B896] to-[#B89574]",
    "bg-linear-135 from-[#E8D9C0] to-[#D4B896]",
    "bg-linear-135 from-[#C9CFC7] to-[#8FA091]",
];

const MAX_PHOTOS = 6;
const MAX_VIDEOS = 3;

// Shared by the page and generateMetadata (cache() dedupes the query within a
// request). Only publishable fields are selected — no owner contact details.
const getKennel = cache(async (slug: string) =>
    prisma.kennel.findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            location: true,
            city: true,
            state: true,
            description: true,
            isVerified: true,
            createdAt: true,
            breeds: {
                orderBy: { createdAt: "asc" },
                select: { breed: { select: { id: true, name: true } } },
            },
            dogs: {
                // Sold dogs have left the kennel; keep them off the public roster.
                where: { status: { not: "SOLD" } },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    breed: true,
                    gender: true,
                    lifeStage: true,
                    birthDate: true,
                    registry: true,
                    photoUrls: true,
                },
            },
            litters: {
                orderBy: [{ bornAt: "desc" }, { createdAt: "desc" }],
                select: {
                    id: true,
                    name: true,
                    breed: true,
                    status: true,
                    puppyCount: true,
                    availableCount: true,
                    bornAt: true,
                    expectedGoHomeDate: true,
                    dam: { select: { name: true } },
                    sire: { select: { name: true } },
                },
            },
            media: {
                where: { dogId: null },
                orderBy: { createdAt: "asc" },
                select: { id: true, type: true, url: true, breedId: true },
            },
        },
    }),
);

function getLocationLabel(kennel: { location: string; city: string; state: string }) {
    return kennel.location.trim() || [kennel.city, kennel.state].filter(Boolean).join(", ");
}

function Star({ filled = true }: { filled?: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#F59E0B" : "none"} stroke={filled ? undefined : "#F59E0B"} strokeWidth={filled ? undefined : 1.5} aria-hidden>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
        </svg>
    );
}

function SectionHeading({ children, className = "mb-4.5" }: { children: React.ReactNode; className?: string }) {
    return <h2 className={`font-(family-name:--font-playfair) text-[22px] font-bold text-[#1C1917] ${className}`}>{children}</h2>;
}

export async function generateMetadata({ params }: Pick<KennelProfilePageProps, "params">): Promise<Metadata> {
    const { locale, slug } = await params;
    const [kennel, t] = await Promise.all([getKennel(slug), getTranslations({ locale, namespace: "public.kennel" })]);

    if (!kennel) {
        return { title: t("metadata.notFound") };
    }

    const title = t("metadata.title", { name: kennel.name });
    const description =
        kennel.description?.slice(0, 155) ||
        t("metadata.fallbackDescription", {
            name: kennel.name,
            location: getLocationLabel(kennel) || t("locationUnavailable"),
        });

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: kennel.logoUrl ? [kennel.logoUrl] : undefined,
            type: "profile",
        },
    };
}

export default async function KennelProfilePage({ params, searchParams }: KennelProfilePageProps) {
    const { slug } = await params;
    const { breed: breedParam } = await searchParams;
    const [kennel, t, format] = await Promise.all([getKennel(slug), getTranslations("public.kennel"), getFormatter()]);

    if (!kennel) {
        notFound();
    }

    const location = getLocationLabel(kennel) || t("locationUnavailable");
    const breeds = kennel.breeds.map((kb) => kb.breed);
    const isMultiBreed = breeds.length > 1;

    // Multi-breed kennels scope litters/photos/videos/dogs to a breed tab
    // (?breed=<slug>); unknown values fall back to the first breed.
    const activeBreed = breeds.find((b) => slugify(b.name) === breedParam) ?? breeds[0] ?? null;
    const inTab = (freeTextBreed: string) => !isMultiBreed || !activeBreed || isSameBreed(freeTextBreed, activeBreed.name);
    const mediaInTab = (breedId: string | null) => !isMultiBreed || breedId === null || breedId === activeBreed?.id;
    const scoped = (key: string, fallback: string) =>
        isMultiBreed && activeBreed ? t(`${key}Breed`, { breed: activeBreed.name }) : fallback;

    const availableLitters = kennel.litters.filter((l) => l.status === "AVAILABLE" && inTab(l.breed));
    const hasLitters = availableLitters.length > 0;
    const nextPlanned = kennel.litters
        .filter((l) => l.status === "PLANNED" && l.expectedGoHomeDate && inTab(l.breed))
        .sort((a, b) => a.expectedGoHomeDate!.getTime() - b.expectedGoHomeDate!.getTime())[0];

    const photos = kennel.media.filter((m) => m.type === "PHOTO");
    const cover = photos[0] ?? null;
    const tabPhotos = photos.filter((m) => mediaInTab(m.breedId)).slice(0, MAX_PHOTOS);
    const tabVideos = kennel.media.filter((m) => m.type === "VIDEO" && mediaInTab(m.breedId)).slice(0, MAX_VIDEOS);

    const now = new Date();
    const yearsActive = now.getFullYear() - kennel.createdAt.getFullYear();
    const littersRaised = kennel.litters.filter((l) => l.status !== "PLANNED").length;

    const AGE_KEYS = { weeks: "dogs.ageWeeks", months: "dogs.ageMonths", years: "dogs.ageYears" } as const;
    const ageLabel = (birthDate: Date | null) => {
        if (!birthDate) return null;
        const { unit, count } = dogAge(birthDate, now);
        return t(AGE_KEYS[unit], { count });
    };

    const rosterDogs: RosterDog[] = kennel.dogs
        .filter((dog) => inTab(dog.breed))
        .map((dog) => {
            const gender = dog.gender.toLowerCase();
            const group: RosterDog["group"] =
                dog.lifeStage === "PUPPY" ? "puppy" : gender === "male" ? "male" : gender === "female" ? "female" : "other";
            const role = { puppy: t("dogs.puppy"), male: t("dogs.sire"), female: t("dogs.dam"), other: null }[group];
            const meta = [role, ageLabel(dog.birthDate), [dog.registry, dog.breed].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(" · ");
            return { id: dog.id, slug: dog.slug, name: dog.name, group, meta, photoUrl: dog.photoUrls[0] ?? null };
        });

    const railKennels = activeBreed
        ? await getFeaturedKennels(4, { breedId: activeBreed.id, excludeKennelId: kennel.id })
        : [];

    const statPills = [
        {
            value: (
                <>
                    <Star />
                    {format.number(PLACEHOLDER_RATING.value, { minimumFractionDigits: 1 })}
                </>
            ),
            label: t("stats.rating", { count: PLACEHOLDER_RATING.count }),
        },
        { value: format.number(littersRaised), label: t("stats.littersRaised") },
        { value: yearsActive < 1 ? t("stats.lessThanOneYear") : format.number(yearsActive), label: t("stats.yearsActive") },
    ];

    const metaLine = [
        location,
        breeds.length > 0 &&
            t("specialists", { breeds: format.list(breeds.map((b) => b.name), { type: "conjunction", style: "short" }) }),
        t("memberSince", { year: String(kennel.createdAt.getFullYear()) }),
    ].filter(Boolean);

    const about = (
        <section>
            <SectionHeading className="mb-3.5">{t("about.heading")}</SectionHeading>
            <p className="max-w-195 text-[15px] leading-[1.7] whitespace-pre-line text-[#44403C]">
                {kennel.description?.trim() || t("about.empty", { name: kennel.name })}
            </p>
        </section>
    );

    const litters = hasLitters ? (
        <section>
            <SectionHeading>{scoped("litters.heading", t("litters.heading"))}</SectionHeading>
            <div className="flex flex-col gap-4">
                {availableLitters.map((litter) => {
                    const title = [
                        litter.name ?? t("litters.fallbackName", { breed: litter.breed }),
                        litter.dam && litter.sire && `${litter.dam.name} × ${litter.sire.name}`,
                    ]
                        .filter(Boolean)
                        .join(" · ");
                    const meta = [
                        litter.bornAt && t("litters.born", { date: format.dateTime(litter.bornAt, { dateStyle: "medium" }) }),
                        t("litters.puppies", { count: litter.puppyCount }),
                        litter.availableCount !== null && t("litters.available", { count: litter.availableCount }),
                    ].filter(Boolean);
                    return (
                        <div
                            key={litter.id}
                            className="flex flex-col gap-4 rounded-2xl border border-[#E7E2DA] bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div>
                                <div className="mb-2.5 inline-block rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">
                                    {t("litters.availableNow")}
                                </div>
                                <h3 className="font-(family-name:--font-playfair) text-lg font-bold text-[#1C1917]">{title}</h3>
                                <div className="mt-1 text-[13px] text-[#78716C]">{meta.join("  ·  ")}</div>
                            </div>
                            {/* TODO: link to the litter page once it exists. */}
                            <a
                                href="#"
                                className="self-start rounded-lg bg-[#4F46E5] px-5.5 py-3 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#4338CA] sm:self-auto"
                            >
                                {t("litters.view")}
                            </a>
                        </div>
                    );
                })}
            </div>
        </section>
    ) : (
        <div className="flex items-center gap-3 rounded-[14px] bg-[#F5F1EA] px-5.5 py-4.5">
            <Clock className="size-4.5 shrink-0 text-[#78716C]" strokeWidth={2} aria-hidden />
            <span className="text-sm text-[#57534E]">{t("litters.none")}</span>
        </div>
    );

    const contactRows = [
        { icon: MapPin, text: location },
        {
            icon: CalendarDays,
            text: nextPlanned
                ? t("contact.nextLitter", { date: format.dateTime(nextPlanned.expectedGoHomeDate!, { month: "long", year: "numeric" }) })
                : t("contact.waitlistOpen"),
        },
        { icon: Mail, text: t("contact.responseTime") },
    ];
    // Waitlist becomes the primary action when there's nothing to buy now.
    const [primaryCta, secondaryCta] = hasLitters
        ? [t("contact.contactKennel"), t("contact.joinWaitlist")]
        : [t("contact.joinWaitlist"), t("contact.contactKennel")];

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
                    <span className="font-medium text-[#1C1917]" aria-current="page">
                        {kennel.name}
                    </span>
                </nav>

                {/* Hero */}
                <div className="mt-5.5 h-45 overflow-hidden rounded-[20px] bg-linear-135 from-[#E8D9C0] to-[#D4B896] sm:h-70">
                    {cover && <img src={cover.url} alt="" className="h-full w-full object-cover" />}
                </div>

                {/* Identity row */}
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2.5">
                        <div className="relative -mt-10 flex size-27.5 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border-5 border-white bg-[#F5F1EA] shadow-[0_4px_16px_rgba(28,25,23,0.12)] sm:size-37.5">
                            {kennel.logoUrl ? (
                                <img src={kennel.logoUrl} alt={t("logoAlt", { name: kennel.name })} className="h-full w-full object-cover" />
                            ) : (
                                <PawPrint className="size-11 text-[#B89574] sm:size-15" strokeWidth={1.5} aria-hidden />
                            )}
                        </div>
                        <div className="sm:mt-5.5">
                            <div className="mb-2 flex flex-wrap items-center gap-2.5">
                                <h1 className="font-(family-name:--font-playfair) text-[26px] leading-tight font-bold sm:text-[30px]">{kennel.name}</h1>
                                {/* Backed by Kennel.isVerified, set manually until a verification workflow exists. */}
                                {kennel.isVerified && (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#4ADE80" role="img" aria-label={t("verified")}>
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M8.5 12.5l2.3 2.3 4.7-5.2" stroke="#1C1917" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                <KennelShareButton kennelName={kennel.name} />
                            </div>
                            <div className="text-[15px] font-medium text-[#57534E]">
                                {metaLine.map((part, i) => (
                                    <span key={i}>
                                        {i > 0 && <span className="mx-2" aria-hidden>·</span>}
                                        {part}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* TODO: rating is a static placeholder until a Review model exists. */}
                    <div className="flex gap-3 lg:mt-6">
                        {statPills.map((pill) => (
                            <div key={pill.label} className="rounded-xl bg-white px-4.5 py-2.5 text-center shadow-[0_2px_10px_rgba(28,25,23,0.08)]">
                                <div className="flex items-center justify-center gap-1 text-lg font-bold text-[#1C1917]">{pill.value}</div>
                                <div className="text-[11px] text-[#78716C]">{pill.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-10 lg:mt-13.5 lg:grid-cols-[minmax(0,820fr)_436px] lg:gap-14">
                    <div className="min-w-0">
                        {isMultiBreed && (
                            <nav aria-label={t("tabs.label")} className="tab-scroll mb-7 flex gap-9 border-b border-[#E7E2DA]">
                                {breeds.map((breed) => {
                                    const active = breed.id === activeBreed?.id;
                                    return (
                                        <Link
                                            key={breed.id}
                                            href={{ pathname: `/kennel/${kennel.slug}`, query: { breed: slugify(breed.name) } }}
                                            scroll={false}
                                            aria-current={active ? "page" : undefined}
                                            className={`-mb-px border-b-3 px-1 pb-3.5 text-[15px] whitespace-nowrap transition-colors ${
                                                active
                                                    ? "border-[#4F46E5] font-semibold text-[#1C1917]"
                                                    : "border-transparent font-medium text-[#78716C] hover:text-[#1C1917]"
                                            }`}
                                        >
                                            {breed.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                        )}

                        {/* Litters lead when any are available; otherwise About leads, then the waitlist notice. */}
                        {hasLitters ? (
                            <>
                                {litters}
                                <div className="mt-9">{about}</div>
                            </>
                        ) : (
                            <>
                                {about}
                                <div className="mt-7">{litters}</div>
                            </>
                        )}

                        {tabPhotos.length > 0 && (
                            <section className="mt-9">
                                <SectionHeading>{scoped("photos.heading", t("photos.heading"))}</SectionHeading>
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    {tabPhotos.map((photo, i) => (
                                        <div key={photo.id} className={`h-40 w-full overflow-hidden rounded-xl ${TILE_GRADIENTS[i % TILE_GRADIENTS.length]}`}>
                                            <img src={photo.url} alt={t("photos.alt", { name: kennel.name })} loading="lazy" className="h-full w-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {tabVideos.length > 0 && (
                            <section className="mt-9">
                                <SectionHeading>{scoped("videos.heading", t("videos.heading"))}</SectionHeading>
                                <div className="flex flex-col gap-4 sm:flex-row">
                                    {tabVideos.map((video, i) => (
                                        <ProfileVideoTile key={video.id} url={video.url} gradient={TILE_GRADIENTS[(i + 4) % TILE_GRADIENTS.length]} />
                                    ))}
                                </div>
                            </section>
                        )}

                        <KennelDogRoster
                            key={activeBreed?.id}
                            heading={scoped("dogs.heading", t("dogs.heading"))}
                            kennelSlug={kennel.slug}
                            dogs={rosterDogs}
                        />

                        {/* TODO: static placeholders until a Review model exists (see lib/placeholder-reviews.ts). */}
                        <section className="mt-9">
                            <SectionHeading>{t("reviews.heading")}</SectionHeading>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                {PLACEHOLDER_REVIEWS.map((review) => (
                                    <figure key={review.author} className="rounded-[14px] border border-[#E7E2DA] bg-white p-5">
                                        <div className="mb-2.5 flex gap-0.5" role="img" aria-label={t("reviews.stars", { count: review.stars })}>
                                            {Array.from({ length: 5 }, (_, i) => (
                                                <Star key={i} filled={i < review.stars} />
                                            ))}
                                        </div>
                                        <blockquote className="mb-3 text-sm leading-[1.6] text-[#44403C]">&ldquo;{review.text}&rdquo;</blockquote>
                                        <figcaption className="text-[13px] font-semibold text-[#1C1917]">
                                            {review.author}{" "}
                                            <span className="font-normal text-[#78716C]">
                                                · {format.dateTime(new Date(`${review.month}-15`), { month: "short", year: "numeric" })}
                                            </span>
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Contact card — placeholder CTAs until messaging/waitlist exist. */}
                    <aside className="h-fit rounded-2xl border border-[#E7E2DA] bg-white p-7">
                        <h3 className="mb-4 font-(family-name:--font-playfair) text-[17px] font-bold text-[#1C1917]">
                            {hasLitters ? t("contact.heading") : t("contact.headingNoLitters")}
                        </h3>
                        <ul className="mb-5 flex flex-col gap-3">
                            {contactRows.map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-center gap-2.5 text-sm text-[#44403C]">
                                    <Icon className="size-4 shrink-0 text-[#78716C]" strokeWidth={2} aria-hidden />
                                    {text}
                                </li>
                            ))}
                        </ul>
                        <a
                            href="#"
                            className="mb-2.5 block rounded-[10px] bg-[#4F46E5] p-3.5 text-center text-[15px] font-semibold text-white transition-colors hover:bg-[#4338CA]"
                        >
                            {primaryCta}
                        </a>
                        <a
                            href="#"
                            className="block rounded-[10px] bg-[#F5F1EA] p-3.25 text-center text-sm font-medium text-[#44403C] transition-colors hover:bg-[#F0ECE3]"
                        >
                            {secondaryCta}
                        </a>
                    </aside>
                </div>

                {activeBreed && railKennels.length > 0 && (
                    <section className="mt-16">
                        <SectionHeading>{t("rail.heading", { breed: activeBreed.name })}</SectionHeading>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {railKennels.map((other, i) => (
                                <Link
                                    key={other.id}
                                    href={`/kennel/${other.slug}`}
                                    className="block overflow-hidden rounded-[14px] border border-[#E7E2DA] bg-white text-[#1C1917] transition-colors hover:text-[#4F46E5]"
                                >
                                    <div className={`h-37.5 w-full ${TILE_GRADIENTS[i % TILE_GRADIENTS.length]}`}>
                                        {other.photoUrl && <img src={other.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                                    </div>
                                    <div className="px-4 py-3.5">
                                        <div className="text-[15px] font-bold">{other.name}</div>
                                        <div className="mt-0.5 text-xs text-[#78716C]">
                                            {[
                                                other.location || t("locationUnavailable"),
                                                // TODO: static placeholder until a Review model exists.
                                                t("rail.rating", { rating: format.number(PLACEHOLDER_RATING.value, { minimumFractionDigits: 1 }) }),
                                            ].join("  ·  ")}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <SiteFooter variant="dark" />
        </div>
    );
}
