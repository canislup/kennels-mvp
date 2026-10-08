"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
    en: "EN",
    "pt-BR": "PT-BR",
};

// "default" is the dashboard styling; "stone" and "overlay" are for the public
// header (on white, and floating over the homepage hero photo).
const TONES = {
    default: {
        group: "bg-slate-100",
        active: "bg-white text-indigo-700 shadow-sm",
        idle: "text-slate-500 hover:text-slate-900",
    },
    stone: {
        group: "bg-[#F0ECE3]",
        active: "bg-white text-[#1C1917] shadow-sm",
        idle: "text-[#78716C] hover:text-[#1C1917]",
    },
    overlay: {
        group: "bg-white/15 border border-white/40",
        active: "bg-white text-[#1C1917]",
        idle: "text-white/90 hover:text-white",
    },
} as const;

export default function LocaleSwitcher({ tone = "default" }: { tone?: keyof typeof TONES }) {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations("common.localeSwitcher");
    const styles = TONES[tone];

    return (
        <div
            role="group"
            aria-label={t("label")}
            className={`inline-flex items-center gap-0.5 rounded-full p-1 ${styles.group}`}
        >
            {routing.locales.map((loc) => {
                const isActive = loc === locale;
                return (
                    <button
                        key={loc}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => router.replace(pathname, { locale: loc })}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                            isActive ? styles.active : styles.idle
                        }`}
                    >
                        {LOCALE_LABELS[loc]}
                    </button>
                );
            })}
        </div>
    );
}
