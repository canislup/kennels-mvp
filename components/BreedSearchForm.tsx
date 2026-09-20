"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search, PawPrint } from "lucide-react";

type Breed = {
  id: string;
  name: string;
};

export default function BreedSearchForm({ breeds }: { breeds: Breed[] }) {
  const router = useRouter();
  const t = useTranslations("public.home.search");

  // Native FormData extraction, no controlled inputs needed.
  const handleSearch = (formData: FormData) => {
    const breed = formData.get("breed") as string;

    if (!breed) return;

    router.push(`/kennels?breed=${encodeURIComponent(breed)}`);
  };

  return (
    <form
      action={handleSearch}
      className="flex flex-col sm:flex-row items-stretch gap-2 w-full max-w-2xl bg-white p-2.5 rounded-3xl sm:rounded-full shadow-xl border border-slate-100"
    >
      <div className="relative flex-1">
        <PawPrint
          className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none"
          size={22}
        />
        <select
          name="breed"
          required
          defaultValue=""
          className="w-full h-full appearance-none pl-13 pr-4 py-4 sm:py-3.5 rounded-full bg-transparent text-slate-800 text-base font-medium outline-none cursor-pointer"
          style={{ paddingLeft: "3.25rem" }}
        >
          <option value="" disabled>
            {t("placeholder")}
          </option>
          {breeds.map((breed) => (
            <option key={breed.id} value={breed.name}>
              {breed.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base px-8 py-4 sm:py-3.5 rounded-full transition-colors whitespace-nowrap shadow-md shadow-indigo-600/20 cursor-pointer"
      >
        <Search size={18} strokeWidth={2.5} />
        {t("submit")}
      </button>
    </form>
  );
}
