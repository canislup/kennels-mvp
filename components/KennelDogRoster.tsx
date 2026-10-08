"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type RosterDog = {
    id: string;
    slug: string;
    name: string;
    group: "male" | "female" | "puppy" | "other";
    meta: string; // pre-formatted on the server, e.g. "Dam · 4 yrs · CBKC Golden Retriever"
    photoUrl: string | null;
};

const FILTERS = ["all", "males", "females", "puppies"] as const;
type Filter = (typeof FILTERS)[number];

const MATCHES: Record<Filter, (dog: RosterDog) => boolean> = {
    all: () => true,
    males: (dog) => dog.group === "male",
    females: (dog) => dog.group === "female",
    puppies: (dog) => dog.group === "puppy",
};

export default function KennelDogRoster({
    heading,
    kennelSlug,
    dogs,
}: {
    heading: string;
    kennelSlug: string;
    dogs: RosterDog[];
}) {
    const t = useTranslations("public.kennel.dogs");
    const [filter, setFilter] = useState<Filter>("all");
    const visible = dogs.filter(MATCHES[filter]);

    return (
        <section className="mt-9">
            <div className="mb-4.5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-(family-name:--font-playfair) text-[22px] font-bold">{heading}</h2>
                <div className="flex gap-2" role="group" aria-label={t("filterLabel")}>
                    {FILTERS.map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key)}
                            aria-pressed={filter === key}
                            className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                                filter === key
                                    ? "border-[#1C1917] bg-[#1C1917] text-white"
                                    : "border-[#E7E2DA] bg-white text-[#57534E] hover:border-[#1C1917]"
                            }`}
                        >
                            {t(`filters.${key}`)}
                        </button>
                    ))}
                </div>
            </div>

            {visible.length === 0 ? (
                <p className="rounded-[14px] border border-dashed border-[#E7E2DA] px-5 py-8 text-center text-sm text-[#78716C]">
                    {dogs.length === 0 ? t("empty") : t("emptyFilter")}
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((dog) => (
                        <Link
                            key={dog.id}
                            href={`/kennel/${kennelSlug}/dog/${dog.slug}`}
                            className="block overflow-hidden rounded-[14px] border border-[#E7E2DA] bg-white transition-[box-shadow,transform] duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(28,25,23,0.08)]"
                        >
                            <div className="h-42.5 w-full bg-linear-135 from-[#F0DCA8] to-[#DDB877]">
                                {dog.photoUrl && (
                                    <img src={dog.photoUrl} alt={dog.name} loading="lazy" className="h-full w-full object-cover" />
                                )}
                            </div>
                            <div className="px-4 py-3.5">
                                <div className="text-[15px] font-bold text-[#1C1917]">{dog.name}</div>
                                <div className="mt-0.5 text-xs text-[#78716C]">{dog.meta}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
