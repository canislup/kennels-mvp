"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
    en: "EN",
    "pt-BR": "PT-BR",
};

// "dashboard" is the segmented EN | PT control from the dashboard designs
// (theme tokens); "stone" and "overlay" are for the public header (on white,
// and floating over the homepage hero photo).
const TONES = {
    dashboard: {
        group: "overflow-hidden rounded-full border border-line bg-white",
        button: "px-3 py-1.5 text-xs font-semibold",
        active: "bg-stone-900 text-stone-50",
        idle: "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
        labels: { en: "EN", "pt-BR": "PT" },
    },
    stone: {
        group: "gap-0.5 rounded-full p-1 bg-[#F0ECE3]",
        button: "px-3 py-1 text-xs font-bold rounded-full",
        active: "bg-white text-[#1C1917] shadow-sm",
        idle: "text-[#78716C] hover:text-[#1C1917]",
        labels: LOCALE_LABELS,
    },
    overlay: {
        group: "gap-0.5 rounded-full p-1 bg-white/15 border border-white/40",
        button: "px-3 py-1 text-xs font-bold rounded-full",
        active: "bg-white text-[#1C1917]",
        idle: "text-white/90 hover:text-white",
        labels: LOCALE_LABELS,
    },
} as const;

export default function LocaleSwitcher({ tone = "dashboard" }: { tone?: keyof typeof TONES }) {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations("common.localeSwitcher");
    const styles = TONES[tone];

    return (
        <div
            role="group"
            aria-label={t("label")}
            className={`inline-flex items-center ${styles.group}`}
        >
            {routing.locales.map((loc) => {
                const isActive = loc === locale;
                return (
                    <button
                        key={loc}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => router.replace(pathname, { locale: loc })}
                        // Lets screen readers pronounce each label in its own language.
                        lang={loc}
                        className={`${styles.button} transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current ${
                            isActive ? styles.active : styles.idle
                        }`}
                    >
                        {styles.labels[loc]}
                    </button>
                );
            })}
        </div>
    );
}
