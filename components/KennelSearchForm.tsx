"use client";

import { useTranslations } from "next-intl";
import { MapPin, Search } from "lucide-react";
import { openFilterSheet } from "@/components/KennelFilterSheet";
import { useDirectoryParams } from "@/lib/use-directory-params";

type Breed = {
    id: string;
    name: string;
};

// Breed + location search. ≥640px: inline two-field form. <640px: a summary
// pill that opens the filter sheet, where both fields are editable.
export default function KennelSearchForm({ breeds }: { breeds: Breed[] }) {
    const t = useTranslations("public.kennels.search");
    const { searchParams, push } = useDirectoryParams();

    const breed = searchParams.get("breed") ?? "";
    const location = searchParams.get("location") ?? "";
    const summary = [breed, location].filter(Boolean).join(" · ");

    const handleSearch = (formData: FormData) => {
        const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
        push({ breed: text("breed"), location: text("location") });
    };

    return (
        <>
            <form
                // key resets the uncontrolled fields whenever the URL changes
                key={searchParams.toString()}
                action={handleSearch}
                className="hidden max-w-170 items-stretch gap-0.5 rounded-[14px] border border-[#E7E2DA] bg-white p-1.5 shadow-[0_8px_20px_-10px_rgba(28,25,23,0.10)] sm:flex"
            >
                <label className="flex flex-1 items-center gap-2.5 rounded-[10px] px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#4F46E5]/30">
                    <Search size={17} strokeWidth={2} className="shrink-0 text-[#78716C]" aria-hidden />
                    <span className="sr-only">{t("breedLabel")}</span>
                    <select
                        name="breed"
                        defaultValue={breed}
                        className="w-full cursor-pointer appearance-none bg-transparent text-[15px] font-medium text-[#1C1917] outline-none"
                    >
                        <option value="">{t("anyBreed")}</option>
                        {breeds.map((b) => (
                            <option key={b.id} value={b.name}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="my-2 w-px bg-[#E7E2DA]" />
                <label className="flex flex-1 items-center gap-2.5 rounded-[10px] px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#4F46E5]/30">
                    <MapPin size={17} strokeWidth={2} className="shrink-0 text-[#78716C]" aria-hidden />
                    <span className="sr-only">{t("locationLabel")}</span>
                    <input
                        name="location"
                        defaultValue={location}
                        placeholder={t("locationPlaceholder")}
                        className="w-full bg-transparent text-[15px] font-medium text-[#1C1917] outline-none placeholder:text-[#A8A29E]"
                    />
                </label>
                <button
                    type="submit"
                    className="flex items-center justify-center rounded-[9px] bg-[#4F46E5] px-6.5 text-sm font-semibold text-white hover:bg-[#4338CA]"
                >
                    {t("submit")}
                </button>
            </form>

            <button
                type="button"
                onClick={() => openFilterSheet()}
                aria-label={summary ? `${t("mobileEdit")}: ${summary}` : t("mobileEdit")}
                className="flex w-full items-center gap-2.5 rounded-xl border border-[#E7E2DA] bg-white px-3.5 py-3 text-left sm:hidden"
            >
                <Search size={16} strokeWidth={2} className="shrink-0 text-[#78716C]" aria-hidden />
                <span className={`truncate text-sm font-medium ${summary ? "text-[#1C1917]" : "text-[#A8A29E]"}`}>
                    {summary || t("mobileEmpty")}
                </span>
            </button>
        </>
    );
}
