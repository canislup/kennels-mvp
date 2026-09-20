"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
    en: "EN",
    "pt-BR": "PT-BR",
};

export default function LocaleSwitcher() {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations("common.localeSwitcher");

    return (
        <div
            role="group"
            aria-label={t("label")}
            className="inline-flex items-center gap-0.5 bg-slate-100 rounded-full p-1"
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
                            isActive
                                ? "bg-white text-indigo-700 shadow-sm"
                                : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                        {LOCALE_LABELS[loc]}
                    </button>
                );
            })}
        </div>
    );
}
