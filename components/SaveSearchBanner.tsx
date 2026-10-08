import { getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";

// TODO: saved searches have no backend yet. The buttons are intentionally
// inert — don't fake a success state here until the API exists.
export default async function SaveSearchBanner() {
    const t = await getTranslations("public.kennels.saveSearch");

    return (
        <div className="rounded-xl border border-[#DADAF5] bg-[#F0F0FB] px-3.5 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3.5">
            {/* <640px */}
            <div className="sm:hidden">
                <div className="mb-2 text-[13px] text-[#44403C]">{t("bannerMobile")}</div>
                <button type="button" className="text-[13px] font-semibold text-[#4F46E5]">
                    {t("buttonMobile")} &rarr;
                </button>
            </div>

            {/* ≥640px */}
            <div className="hidden items-center gap-2.5 sm:flex">
                <Bell size={17} strokeWidth={2} className="shrink-0 text-[#4F46E5]" aria-hidden />
                <span className="text-sm text-[#44403C]">{t("banner")}</span>
            </div>
            <button
                type="button"
                className="hidden rounded-lg border border-[#4F46E5] bg-white px-4 py-2.25 text-[13px] font-semibold whitespace-nowrap text-[#4F46E5] sm:block"
            >
                {t("button")}
            </button>
        </div>
    );
}
