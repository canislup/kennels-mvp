"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, MapPin, Award, PawPrint } from "lucide-react";

type KennelCardDog = {
    photoUrls: string[];
    status: string;
};

export type KennelCardData = {
    slug: string;
    name: string;
    logoUrl: string | null;
    location: string;
    city: string;
    state: string;
    prestigeScore: number;
    dogs: KennelCardDog[];
};

const FALLBACK_PHOTO =
    "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";

export default function KennelCard({ kennel }: { kennel: KennelCardData }) {
    const t = useTranslations("public.kennels.card");
    const [index, setIndex] = useState(0);

    const photos = kennel.dogs.flatMap((dog) => dog.photoUrls).slice(0, 8);
    const gallery = photos.length > 0 ? photos : [FALLBACK_PHOTO];
    const hasLitters = kennel.dogs.some((dog) => dog.status === "AVAILABLE_PUPPY");
    const locationLabel =
        kennel.location?.trim() ||
        [kennel.city, kennel.state].filter(Boolean).join(", ") ||
        t("locationUnavailable");

    // Carousel controls must stop the click from bubbling to the wrapping
    // Link, otherwise browsing photos would navigate to the profile page.
    const goNext = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIndex((prev) => (prev + 1) % gallery.length);
    };

    const goPrev = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
    };

    return (
        <Link
            href={`/kennel/${kennel.slug}`}
            className="group block bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
        >
            {/* Mini gallery / carousel */}
            <div className="relative h-52 w-full bg-slate-100 overflow-hidden">
                <img
                    src={gallery[index]}
                    alt={t("photoAlt", { name: kennel.name, index: index + 1 })}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {hasLitters && (
                    <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                        {t("puppiesAvailable")}
                    </span>
                )}

                {gallery.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={goPrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-700" />
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-700" />
                        </button>

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {gallery.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${
                                        i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
                                    }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Card content */}
            <div className="p-5">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 flex-shrink-0 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                        {kennel.logoUrl ? (
                            <img
                                src={kennel.logoUrl}
                                alt={t("logoAlt", { name: kennel.name })}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <PawPrint className="text-slate-400" size={18} />
                        )}
                    </div>

                    <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{kennel.name}</h3>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 truncate">
                            <MapPin size={12} className="flex-shrink-0" />
                            {locationLabel}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Award size={12} />
                        {t("prestige", { score: kennel.prestigeScore })}
                    </span>
                </div>
            </div>
        </Link>
    );
}
