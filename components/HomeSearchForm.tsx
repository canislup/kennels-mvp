"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MapPin, Search } from "lucide-react";

type Breed = {
    id: string;
    name: string;
};

// Hero search: submits to the directory with the same ?breed=&location=
// params it reads. Empty fields are omitted.
export default function HomeSearchForm({ breeds }: { breeds: Breed[] }) {
    const t = useTranslations("public.home.search");
    const router = useRouter();

    const handleSearch = (formData: FormData) => {
        const params = new URLSearchParams();
        for (const key of ["breed", "location"]) {
            const value = String(formData.get(key) ?? "").trim();
            if (value) params.set(key, value);
        }
        const query = params.toString();
        router.push(query ? `/kennels?${query}` : "/kennels");
    };

    return (
        <form
            action={handleSearch}
            className="mt-12 flex w-full max-w-180 flex-col items-stretch gap-0.5 rounded-[18px] border border-[#E7E2DA] bg-white p-2 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.35)] sm:flex-row"
        >
            <label className="flex flex-1 items-center gap-3 rounded-xl px-4.5 py-3.5 focus-within:ring-2 focus-within:ring-[#4F46E5]/30">
                <Search size={19} strokeWidth={2} className="shrink-0 text-[#78716C]" aria-hidden />
                <span className="sr-only">{t("breedLabel")}</span>
                <select
                    name="breed"
                    defaultValue=""
                    className="w-full cursor-pointer appearance-none bg-transparent text-base font-medium text-[#1C1917] outline-none"
                >
                    <option value="">{t("breedPlaceholder")}</option>
                    {breeds.map((breed) => (
                        <option key={breed.id} value={breed.name}>
                            {breed.name}
                        </option>
                    ))}
                </select>
            </label>
            <div className="mx-4.5 h-px bg-[#E7E2DA] sm:mx-0 sm:my-2.5 sm:h-auto sm:w-px" />
            <label className="flex flex-1 items-center gap-3 rounded-xl px-4.5 py-3.5 focus-within:ring-2 focus-within:ring-[#4F46E5]/30">
                <MapPin size={19} strokeWidth={2} className="shrink-0 text-[#78716C]" aria-hidden />
                <span className="sr-only">{t("locationLabel")}</span>
                <input
                    name="location"
                    placeholder={t("locationPlaceholder")}
                    className="w-full bg-transparent text-base font-medium text-[#1C1917] outline-none placeholder:font-normal placeholder:text-[#A8A29E]"
                />
            </label>
            <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-7.5 py-3.5 text-base font-semibold text-white hover:bg-[#4338CA]"
            >
                {t("submit")}
            </button>
        </form>
    );
}
