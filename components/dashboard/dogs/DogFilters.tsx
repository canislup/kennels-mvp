"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import Select from "@/components/dashboard/ui/Select";
import TextInput from "@/components/dashboard/ui/TextInput";

const DEBOUNCE_MS = 300;

/**
 * Search box + breed/sex/life-stage selects. All state lives in the URL:
 * each change updates its search param, keeps the others, and resets `page`.
 */
export default function DogFilters({ breeds }: { breeds: string[] }) {
    const t = useTranslations("dashboard.dogs.list.filters");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const q = searchParams.get("q") ?? "";

    function update(key: string, value: string, mode: "push" | "replace") {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        params.delete("page");
        const query = params.toString();
        router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false });
    }

    // Keep the box in sync when the URL changes from outside (back/forward, "Clear filters").
    useEffect(() => {
        const input = inputRef.current;
        if (input && document.activeElement !== input && input.value !== q) input.value = q;
    }, [q]);

    useEffect(() => () => clearTimeout(timer.current), []);

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-[1_1_260px]">
                <label htmlFor="dog-search" className="sr-only">
                    {t("searchLabel")}
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-500" aria-hidden />
                <TextInput
                    ref={inputRef}
                    id="dog-search"
                    type="search"
                    defaultValue={q}
                    placeholder={t("searchPlaceholder")}
                    className="pl-9.5"
                    onChange={(event) => {
                        const value = event.target.value.trim();
                        clearTimeout(timer.current);
                        timer.current = setTimeout(() => update("q", value, "replace"), DEBOUNCE_MS);
                    }}
                />
            </div>
            <Select aria-label={t("breedLabel")} value={searchParams.get("breed") ?? ""} onChange={(e) => update("breed", e.target.value, "push")} className="flex-[1_1_160px] sm:flex-none">
                <option value="">{t("allBreeds")}</option>
                {breeds.map((breed) => (
                    <option key={breed} value={breed}>
                        {breed}
                    </option>
                ))}
            </Select>
            <Select aria-label={t("sexLabel")} value={searchParams.get("sex") ?? ""} onChange={(e) => update("sex", e.target.value, "push")} className="flex-[1_1_120px] sm:flex-none">
                <option value="">{t("anySex")}</option>
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
            </Select>
            <Select aria-label={t("stageLabel")} value={searchParams.get("stage") ?? ""} onChange={(e) => update("stage", e.target.value, "push")} className="flex-[1_1_140px] sm:flex-none">
                <option value="">{t("anyStage")}</option>
                <option value="puppy">{t("puppy")}</option>
                <option value="adult">{t("adult")}</option>
            </Select>
        </div>
    );
}
