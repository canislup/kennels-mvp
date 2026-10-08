"use client";

import { useTranslations } from "next-intl";
import { Check, ChevronDown, LayoutGrid, ListFilter, Map as MapIcon, TextAlignStart } from "lucide-react";
import KennelFilterSheet, { openFilterSheet } from "@/components/KennelFilterSheet";
import { effectiveSort, KENNEL_SORTS, useDirectoryParams } from "@/lib/use-directory-params";
import type { KennelSort } from "@/lib/kennel-search";

type Breed = {
    id: string;
    name: string;
};

const CHIP =
    "flex cursor-pointer items-center gap-1.5 rounded-full border px-4.5 py-2.25 text-sm font-medium transition-colors";
const CHIP_IDLE = "border-[#E7E2DA] bg-white text-[#44403C] hover:border-[#4F46E5] hover:text-[#4F46E5]";
const CHIP_ACTIVE = "border-[#4F46E5] bg-[#4F46E5] text-white";

// Sticky filter bar: chip row + sort + view toggle on ≥640px, and the
// Filters/Sort/Map trigger row that opens the bottom sheet below that.
export default function KennelFilterBar({ breeds }: { breeds: Breed[] }) {
    const t = useTranslations("public.kennels.filters");
    const { searchParams, push, setSort } = useDirectoryParams();

    const puppies = searchParams.get("puppies") === "true";
    const verified = searchParams.get("verified") === "true";
    const sort = effectiveSort(searchParams);
    const activeCount = [puppies, verified].filter(Boolean).length;

    return (
        <div className="sticky top-0 z-20 border-b border-[#E7E2DA] bg-white">
            {/* ≥640px */}
            <div
                role="group"
                aria-label={t("label")}
                className="mx-auto hidden max-w-360 flex-wrap items-center gap-3 px-8 py-4.5 sm:flex lg:px-16"
            >
                <button
                    type="button"
                    aria-pressed={puppies}
                    onClick={() => push({ puppies: puppies ? null : "true" })}
                    className={`${CHIP} ${puppies ? CHIP_ACTIVE : CHIP_IDLE}`}
                >
                    {t("puppies")}
                </button>
                <button
                    type="button"
                    aria-pressed={verified}
                    onClick={() => push({ verified: verified ? null : "true" })}
                    className={`${CHIP} ${verified ? CHIP_ACTIVE : CHIP_IDLE}`}
                >
                    <Check size={13} strokeWidth={2.5} className={verified ? "text-white" : "text-[#166534]"} aria-hidden />
                    {t("verified")}
                </button>
                {/* TODO: static visual — no additional filters exist yet. */}
                <button type="button" className={`${CHIP} ${CHIP_IDLE}`}>
                    {t("moreFilters")}
                </button>

                <div className="flex-1" />

                <label className="relative flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#E7E2DA] bg-white py-2.25 pr-3.5 pl-3.5 has-focus-visible:ring-2 has-focus-visible:ring-[#4F46E5]/40">
                    <TextAlignStart size={15} strokeWidth={2} className="text-[#1C1917]" aria-hidden />
                    <span className="text-[13px] text-[#78716C]">{t("sortLabel")}</span>
                    <select
                        aria-label={t("sortAria")}
                        value={sort}
                        // Controlled by the URL: a denied location prompt leaves it unchanged.
                        onChange={(e) => setSort(e.target.value as KennelSort)}
                        className="cursor-pointer appearance-none bg-transparent pr-5 text-sm font-semibold text-[#1C1917] outline-none"
                    >
                        {KENNEL_SORTS.map((option) => (
                            <option key={option} value={option}>
                                {t(`sort.${option}`)}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={13} strokeWidth={2} className="pointer-events-none absolute right-3.5 text-[#1C1917]" aria-hidden />
                </label>

                <div role="group" aria-label={t("view")} className="flex items-center overflow-hidden rounded-[10px] border border-[#E7E2DA] bg-white">
                    <button
                        type="button"
                        aria-pressed
                        className="flex items-center gap-1.5 bg-[#1C1917] px-4 py-2.25 text-[13px] font-semibold text-white"
                    >
                        <LayoutGrid size={14} strokeWidth={2} aria-hidden />
                        {t("viewList")}
                    </button>
                    {/* TODO: static visual — map view not built yet. */}
                    <button
                        type="button"
                        aria-pressed={false}
                        className="flex items-center gap-1.5 px-4 py-2.25 text-[13px] font-medium text-[#78716C]"
                    >
                        <MapIcon size={14} strokeWidth={2} aria-hidden />
                        {t("viewMap")}
                    </button>
                </div>
            </div>

            {/* <640px */}
            <div className="flex items-center gap-2.5 px-4.5 py-3 sm:hidden">
                <button
                    type="button"
                    onClick={() => openFilterSheet()}
                    className="flex items-center gap-1.5 rounded-full bg-[#1C1917] px-4 py-2.25 text-[13px] font-semibold text-white"
                >
                    <ListFilter size={13} strokeWidth={2} aria-hidden />
                    {t("mobileFilters")}
                </button>
                <button
                    type="button"
                    onClick={() => openFilterSheet("sort")}
                    className="rounded-full border border-[#E7E2DA] bg-white px-4 py-2.25 text-[13px] font-medium text-[#44403C]"
                >
                    {t("mobileSort")}
                </button>
                {/* TODO: static visual — map view not built yet. */}
                <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full border border-[#E7E2DA] bg-white px-4 py-2.25 text-[13px] font-medium text-[#44403C]"
                >
                    <MapIcon size={13} strokeWidth={2} className="text-[#78716C]" aria-hidden />
                    {t("viewMap")}
                </button>
                <div className="flex-1" />
                {activeCount > 0 && (
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#4F46E5] text-xs font-bold text-white">
                        <span aria-hidden>{activeCount}</span>
                        <span className="sr-only">{t("activeCount", { count: activeCount })}</span>
                    </span>
                )}
            </div>

            <KennelFilterSheet breeds={breeds} />
        </div>
    );
}
