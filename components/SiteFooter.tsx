import { getTranslations } from "next-intl/server";

// "dark" matches Directory.html's footer, "light" matches Home.html's.
export default async function SiteFooter({ variant }: { variant: "dark" | "light" }) {
    const t = await getTranslations("public.footer");
    const year = new Date().getFullYear();

    if (variant === "light") {
        return (
            <footer className="mt-auto border-t border-[#E7E2DA]">
                <div className="mx-auto flex max-w-360 flex-col items-center gap-2 px-4.5 py-9 sm:flex-row sm:justify-between sm:px-8 sm:py-10 lg:px-16">
                    <span className="font-(family-name:--font-playfair) text-lg font-semibold text-[#1C1917]">
                        Kennel<span className="text-[#4F46E5]">OS</span>
                    </span>
                    <span className="text-[13px] text-[#A8A29E]">{t("rights", { year })}</span>
                </div>
            </footer>
        );
    }

    return (
        <footer className="bg-[#1C1917]">
            <div className="mx-auto flex max-w-360 flex-col items-center gap-2 px-4.5 py-9 sm:flex-row sm:justify-between sm:px-8 sm:py-14 lg:px-16">
                <div className="font-(family-name:--font-playfair) text-[17px] font-bold text-[#FBF9F6] sm:text-xl">
                    Kennel<span className="text-[#4F46E5]">OS</span>
                </div>
                <div className="text-xs text-[#A8A29E] sm:text-[13px]">
                    <span className="sm:hidden">{t("rightsShort", { year })}</span>
                    <span className="hidden sm:inline">{t("rights", { year })}</span>
                </div>
            </div>
        </footer>
    );
}
