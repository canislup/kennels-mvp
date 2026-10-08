import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check, Star } from "lucide-react";
import type { KennelCardData } from "@/lib/kennel-search";

// No "use client": rendered on the server for the first page and inside
// InfiniteKennelList for appended pages.
export default function KennelCard({
    kennel,
    eyebrow,
}: {
    kennel: KennelCardData;
    eyebrow?: string;
}) {
    const t = useTranslations("public.kennels.card");
    const meta = [kennel.location || t("locationUnavailable"), kennel.breed].filter(Boolean).join(" · ");

    // The whole card is the click target — contact only happens on the profile.
    return (
        <Link
            href={`/kennel/${kennel.slug}`}
            className="block overflow-hidden rounded-2xl border border-[#E7E2DA] bg-white text-[#1C1917] transition-[box-shadow,transform] duration-150 ease-in-out hover:text-[#4F46E5] sm:hover:-translate-y-0.5 sm:hover:shadow-[0_10px_28px_rgba(28,25,23,0.10)]"
        >
            <div className="relative h-50 w-full bg-linear-135 from-[#E8D9C0] to-[#D4B896] sm:h-55">
                {kennel.photoUrl && (
                    <img
                        src={kennel.photoUrl}
                        alt={t("photoAlt", { name: kennel.name })}
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                )}

                {kennel.hasPuppies && (
                    <span className="absolute top-3 left-3 rounded-full bg-[#166534] px-2.75 py-1.25 text-[11px] font-semibold text-white sm:top-3.5 sm:left-3.5 sm:px-3 sm:py-1.5 sm:text-xs">
                        {t("puppiesAvailable")}
                    </span>
                )}

                {/* Backed by Kennel.isVerified, set manually until a verification workflow exists. */}
                {kennel.isVerified && (
                    <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white px-2.25 py-1.25 text-[11px] font-semibold text-[#1C1917] sm:top-3.5 sm:right-3.5 sm:px-2.5 sm:py-1.5 sm:text-xs">
                        <Check className="size-2.75 text-[#166534] sm:size-3" strokeWidth={3} aria-hidden />
                        {t("verified")}
                    </span>
                )}
            </div>

            <div className="px-4.5 py-4 sm:px-5.5 sm:py-5">
                {eyebrow && (
                    <div className="mb-1.5 hidden text-[11px] font-semibold tracking-[0.4px] text-[#4F46E5] uppercase sm:block">
                        {eyebrow}
                    </div>
                )}
                <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-(family-name:--font-playfair) text-[17px] font-bold sm:text-[19px]">
                        {kennel.name}
                    </h3>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FEF3C7] px-2.25 py-1 text-xs font-semibold text-[#92400E] sm:px-2.5 sm:text-[13px]">
                        <Star className="size-2.5 sm:size-2.75" fill="currentColor" strokeWidth={0} aria-hidden />
                        <span aria-hidden>{kennel.prestigeScore}</span>
                        <span className="sr-only">{t("prestigeAria", { score: kennel.prestigeScore })}</span>
                    </span>
                </div>
                <div className="mt-1 text-[13px] text-[#78716C] sm:mt-1.5">{meta}</div>
            </div>
        </Link>
    );
}
