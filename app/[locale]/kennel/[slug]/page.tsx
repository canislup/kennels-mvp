import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import {
    MapPin,
    Award,
    PawPrint,
    Mail,
    Phone,
    Clock,
    CalendarDays,
    Users,
    ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/db";

const FALLBACK_PHOTO =
    "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";

type KennelProfilePageProps = {
    params: Promise<{ locale: string; slug: string }>;
};

// Single source of truth for the fetch — reused by both the page and
// generateMetadata. Never selects Owner.passwordHash: this data can end up
// serialized straight into the rendered HTML (contact card), so only the
// fields that are safe to publish are selected in the first place.
async function getKennel(slug: string) {
    return prisma.kennel.findUnique({
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
            primaryBreeds: true,
            prestigeScore: true,
            owner: {
                select: { fullName: true, email: true, phoneNumber: true },
            },
            dogs: {
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    breed: true,
                    gender: true,
                    status: true,
                    lineage: true,
                    photoUrls: true,
                },
            },
            litters: {
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    breed: true,
                    puppyCount: true,
                    expectedGoHomeDate: true,
                    status: true,
                    dam: { select: { name: true } },
                    sire: { select: { name: true } },
                },
            },
        },
    });
}

type KennelData = NonNullable<Awaited<ReturnType<typeof getKennel>>>;

function getLocationLabel(
    kennel: Pick<KennelData, "location" | "city" | "state">,
    fallback: string
) {
    return (
        kennel.location?.trim() ||
        [kennel.city, kennel.state].filter(Boolean).join(", ") ||
        fallback
    );
}

export async function generateMetadata({
    params,
}: KennelProfilePageProps): Promise<Metadata> {
    const { locale, slug } = await params;
    const [kennel, t] = await Promise.all([
        getKennel(slug),
        getTranslations({ locale, namespace: "public.kennel" }),
    ]);

    if (!kennel) {
        return { title: t("metadata.notFound") };
    }

    const locationLabel = getLocationLabel(kennel, t("locationUnavailable"));
    const title = t("metadata.title", { name: kennel.name });
    const description =
        kennel.description?.slice(0, 155) ||
        t("metadata.fallbackDescription", { name: kennel.name, location: locationLabel });

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

export default async function KennelProfilePage({ params }: KennelProfilePageProps) {
    const { slug } = await params;
    const [kennel, t] = await Promise.all([
        getKennel(slug),
        getTranslations("public.kennel"),
    ]);

    if (!kennel) {
        notFound();
    }

    const locationLabel = getLocationLabel(kennel, t("locationUnavailable"));
    const coverPhoto = kennel.dogs.flatMap((dog) => dog.photoUrls)[0];
    const parentDogs = kennel.dogs.filter((dog) => dog.status === "BREEDING_STOCK");

    const LITTER_PRIORITY: Record<string, number> = {
        AVAILABLE: 0,
        RESERVED: 1,
        PLANNED: 2,
        SOLD_OUT: 3,
    };
    const upcomingLitters = kennel.litters
        .filter((litter) => litter.status !== "SOLD_OUT")
        .sort((a, b) => (LITTER_PRIORITY[a.status] ?? 99) - (LITTER_PRIORITY[b.status] ?? 99));

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Hero */}
            <section className="relative">
                <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-linear-to-br from-amber-100 via-orange-50 to-indigo-100">
                    {coverPhoto && (
                        <img
                            src={coverPhoto}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/30 via-black/0 to-black/0" />
                </div>

                <div className="max-w-6xl mx-auto px-6">
                    <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end gap-5 pb-6">
                        <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl bg-white p-1.5 shadow-lg shrink-0">
                            <div className="h-full w-full rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
                                {kennel.logoUrl ? (
                                    <img
                                        src={kennel.logoUrl}
                                        alt={t("logoAlt", { name: kennel.name })}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <PawPrint className="text-slate-400" size={36} />
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0 pb-1">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                                {kennel.name}
                            </h1>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-full shadow-sm">
                                    <MapPin size={14} className="text-slate-400" />
                                    {locationLabel}
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                                    <Award size={14} />
                                    {t("prestige", { score: kennel.prestigeScore })}
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                                    <ShieldCheck size={14} />
                                    {t("verified")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main grid */}
            <div className="max-w-6xl mx-auto px-6 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left column */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* About Us */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                            <h2 className="text-xl font-bold text-slate-900 mb-3">
                                {t("about.heading", { name: kennel.name })}
                            </h2>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                {kennel.description?.trim() ||
                                    t("about.empty", { name: kennel.name })}
                            </p>
                            {kennel.primaryBreeds.length > 0 && (
                                <div className="mt-5 pt-5 border-t border-slate-100">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5">
                                        {t("about.breeds")}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {kennel.primaryBreeds.map((breed) => (
                                            <span
                                                key={breed}
                                                className="inline-flex items-center bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full"
                                            >
                                                {breed}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Litters */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4">
                                {t("litters.heading")}
                            </h2>
                            {upcomingLitters.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm font-medium">
                                    {t("litters.empty")}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {upcomingLitters.map((litter) => (
                                        <LitterCard key={litter.id} litter={litter} />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Dogs */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4">
                                {t("dogs.heading")}
                            </h2>
                            {parentDogs.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm font-medium">
                                    {t("dogs.empty")}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {parentDogs.map((dog) => (
                                        <ParentDogCard key={dog.id} dog={dog} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="lg:sticky lg:top-24">
                            <ContactCard kennel={kennel} />
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}

// --- Local presentational components -------------------------------------

const LITTER_STATUS_STYLES: Record<string, string> = {
    AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-100",
    RESERVED: "bg-amber-50 text-amber-700 border-amber-100",
    PLANNED: "bg-slate-100 text-slate-600 border-slate-200",
    SOLD_OUT: "bg-slate-100 text-slate-500 border-slate-200",
};

type LitterCardData = KennelData["litters"][number];

async function LitterCard({ litter }: { litter: LitterCardData }) {
    const [t, format] = await Promise.all([
        getTranslations("public.kennel.litters"),
        getFormatter(),
    ]);
    const statusStyle = LITTER_STATUS_STYLES[litter.status] ?? LITTER_STATUS_STYLES.PLANNED;
    const statusLabel = t.has(`status.${litter.status}`) ? t(`status.${litter.status}`) : litter.status;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">{litter.breed}</h3>
                    {(litter.dam || litter.sire) && (
                        <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                            {litter.dam?.name ?? t("unknownDam")} × {litter.sire?.name ?? t("unknownSire")}
                        </p>
                    )}
                </div>
                <span
                    className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${statusStyle}`}
                >
                    {statusLabel}
                </span>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                    <Users size={15} className="text-slate-400" />
                    {t("puppyCount", { count: litter.puppyCount })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={15} className="text-slate-400" />
                    {litter.expectedGoHomeDate
                        ? format.dateTime(litter.expectedGoHomeDate, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                          })
                        : t("dateTbd")}
                </span>
            </div>
        </div>
    );
}

type ParentDogData = KennelData["dogs"][number];

async function ParentDogCard({ dog }: { dog: ParentDogData }) {
    const t = await getTranslations("public.kennel.dogs");
    const photo = dog.photoUrls[0] ?? FALLBACK_PHOTO;
    const role = dog.gender === "Male" ? t("sire") : dog.gender === "Female" ? t("dam") : "";

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-36 w-full bg-slate-100">
                <img src={photo} alt={dog.name} className="h-full w-full object-cover" />
            </div>
            <div className="p-3.5">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{dog.name}</h3>
                    {role && (
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                            {role}
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{dog.breed}</p>
                {dog.lineage && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">{dog.lineage}</p>
                )}
            </div>
        </div>
    );
}

async function ContactCard({ kennel }: { kennel: KennelData }) {
    const t = await getTranslations("public.kennel.contact");
    const email = kennel.owner?.email;
    const phone = kennel.owner?.phoneNumber;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900">{t("heading")}</h3>
            <p className="text-sm text-slate-500 mt-1.5">
                {t("description", { name: kennel.owner?.fullName ?? t("theBreeder") })}
            </p>

            <div className="mt-4 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Clock size={13} />
                {t("responseTime")}
            </div>

            {email ? (
                <a
                    href={`mailto:${email}`}
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-full shadow-sm transition-colors"
                >
                    <Mail size={16} />
                    {t("button")}
                </a>
            ) : (
                <div className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-semibold px-5 py-3 rounded-full text-sm">
                    {t("unavailable")}
                </div>
            )}

            {phone && (
                <a
                    href={`tel:${phone}`}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-5 py-3 rounded-full transition-colors text-sm"
                >
                    <Phone size={15} />
                    {phone}
                </a>
            )}

            <div className="mt-5 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 font-medium">
                <ShieldCheck size={14} className="text-slate-300" />
                {t("footer")}
            </div>
        </div>
    );
}
