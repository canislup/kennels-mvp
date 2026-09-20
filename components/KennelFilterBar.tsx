"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { PawPrint, X } from "lucide-react";

type Breed = {
    id: string;
    name: string;
};

export default function KennelFilterBar({ breeds }: { breeds: Breed[] }) {
    const router = useRouter();
    const t = useTranslations("public.kennels.filters");
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // The URL is the source of truth — no local form state to keep in sync.
    const activeBreed = searchParams.get("breed") ?? "";
    const activeSort = searchParams.get("sort") ?? "prestige";
    const hasLitters = searchParams.get("hasLitters") === "true";

    const updateParam = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());

        if (!value) {
            params.delete(key);
        } else {
            params.set(key, value);
        }

        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => router.push(pathname);

    const hasActiveFilters = Boolean(activeBreed) || hasLitters;

    return (
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Breed selector */}
                <select
                    value={activeBreed}
                    onChange={(e) => updateParam("breed", e.target.value)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                >
                    <option value="">{t("allBreeds")}</option>
                    {breeds.map((breed) => (
                        <option key={breed.id} value={breed.name}>
                            {breed.name}
                        </option>
                    ))}
                </select>

                {/* Available litters toggle */}
                <button
                    type="button"
                    onClick={() => updateParam("hasLitters", hasLitters ? null : "true")}
                    aria-pressed={hasLitters}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
                        hasLitters
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                >
                    <PawPrint size={16} />
                    {t("hasLitters")}
                </button>

                <div className="hidden sm:block flex-1" />

                {/* Sort */}
                <select
                    value={activeSort}
                    onChange={(e) => updateParam("sort", e.target.value)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                >
                    <option value="prestige">{t("sortPrestige")}</option>
                    <option value="newest">{t("sortNewest")}</option>
                </select>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    >
                        <X size={15} />
                        {t("clear")}
                    </button>
                )}
            </div>
        </div>
    );
}
