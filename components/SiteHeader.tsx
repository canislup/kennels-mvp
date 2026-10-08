import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Menu } from "lucide-react";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type Variant = "solid" | "overlay";

// Shared public-site navigation. "overlay" floats transparently over the
// homepage hero (Home.html); "solid" is the white bar used on inner pages
// (Directory.html). Both carry the language switcher.
export default async function SiteHeader({
    variant,
    active,
}: {
    variant: Variant;
    active?: "browse";
}) {
    const t = await getTranslations("public.nav");
    const overlay = variant === "overlay";

    const link = overlay
        ? "text-[15px] font-medium text-white/92 hover:text-white"
        : "text-[15px] font-medium text-[#57534E] hover:text-[#4F46E5]";
    const activeLink = overlay ? link : "text-[15px] font-semibold text-[#4F46E5]";

    const links = (
        <>
            <Link
                href="/kennels"
                aria-current={active === "browse" ? "page" : undefined}
                className={active === "browse" ? activeLink : link}
            >
                {t("browse")}
            </Link>
            {/* TODO: stub — For Breeders page doesn't exist yet. */}
            <a href="#" className={link}>
                {t("forBreeders")}
            </a>
            {/* TODO: stub — How It Works page doesn't exist yet. */}
            <a href="#" className={link}>
                {t("howItWorks")}
            </a>
        </>
    );

    const logo = (
        <Link
            href="/"
            aria-label={t("home")}
            className={
                overlay
                    ? "font-(family-name:--font-playfair) text-[19px] font-semibold tracking-[-0.01em] text-white sm:text-[26px]"
                    : "font-(family-name:--font-playfair) text-[19px] font-bold text-[#1C1917] hover:text-[#4F46E5] sm:text-2xl sm:tracking-[-0.3px]"
            }
        >
            Kennel<span className="text-[#4F46E5]">OS</span>
        </Link>
    );

    const switcher = <LocaleSwitcher tone={overlay ? "overlay" : "stone"} />;

    // TODO: static visual — mobile menu panel not designed/built yet.
    const menuButton = (
        <button type="button" aria-label={t("menu")} className={overlay ? "text-white" : "text-[#1C1917]"}>
            <Menu size={22} strokeWidth={2} aria-hidden />
        </button>
    );

    if (overlay) {
        return (
            <header>
                <nav className="mx-auto flex h-15 max-w-360 items-center justify-between px-4.5 sm:h-22 sm:px-8 lg:px-16">
                    <div className="flex items-center gap-12">
                        {logo}
                        <div className="hidden items-center gap-8 lg:flex">{links}</div>
                    </div>
                    <div className="hidden items-center gap-3 sm:flex">
                        {switcher}
                        <Link href="/login" className="rounded-full px-5 py-3 text-[15px] font-semibold text-white/92 hover:text-white">
                            {t("signIn")}
                        </Link>
                        <Link href="/signup" className="rounded-full bg-white px-5.5 py-3 text-[15px] font-semibold text-[#1C1917]">
                            {t("listKennel")}
                        </Link>
                    </div>
                    <div className="flex items-center gap-3 sm:hidden">
                        {switcher}
                        {menuButton}
                    </div>
                </nav>
            </header>
        );
    }

    return (
        <header className="border-b border-[#E7E2DA] bg-white">
            <nav className="mx-auto flex h-15 max-w-360 items-center justify-between px-4.5 sm:h-21 sm:px-8 lg:px-16">
                {logo}
                <div className="hidden items-center gap-10 lg:flex">{links}</div>
                <div className="hidden items-center gap-4 sm:flex">
                    {switcher}
                    <Link href="/login" className={link}>
                        {t("signIn")}
                    </Link>
                    <Link href="/signup" className="rounded-lg bg-[#1C1917] px-5.5 py-2.75 text-sm font-semibold text-[#FBF9F6]">
                        {t("listKennel")}
                    </Link>
                </div>
                <div className="flex items-center gap-3 sm:hidden">
                    {switcher}
                    {menuButton}
                </div>
            </nav>
        </header>
    );
}
