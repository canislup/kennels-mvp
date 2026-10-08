import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ZoomOut } from "lucide-react";

export default async function KennelEmptyState({ breed, location }: { breed?: string; location?: string }) {
    const t = await getTranslations("public.kennels.emptyState");

    const description =
        breed && location
            ? t("descriptionBreedLocation", { breed, location })
            : breed
              ? t("descriptionBreed", { breed })
              : location
                ? t("descriptionLocation", { location })
                : t("description");

    return (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#E7E2DA] bg-white px-6 py-16 text-center sm:min-h-170 sm:p-10">
            <div className="mb-7 flex size-22 items-center justify-center rounded-full bg-[#F0ECE3]">
                <ZoomOut size={38} strokeWidth={1.6} className="text-[#A8A29E]" aria-hidden />
            </div>
            <h2 className="mb-2.5 font-(family-name:--font-playfair) text-[26px] font-bold">{t("heading")}</h2>
            <p className="mb-8 max-w-115 text-[15px] leading-[1.6] text-[#57534E]">{description}</p>
            <div className="flex flex-wrap items-center justify-center gap-3.5">
                <Link
                    href="/kennels"
                    className="rounded-[10px] border border-[#E7E2DA] bg-white px-6 py-3.25 text-sm font-semibold text-[#1C1917]"
                >
                    {t("clear")}
                </Link>
                {/* TODO: saved searches have no backend yet — intentionally inert, no fake success. */}
                <button
                    type="button"
                    className="rounded-[10px] bg-[#4F46E5] px-6 py-3.25 text-sm font-semibold text-white hover:bg-[#4338CA]"
                >
                    {t("notify")}
                </button>
            </div>
        </div>
    );
}
