"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { effectiveSort, KENNEL_SORTS, useDirectoryParams } from "@/lib/use-directory-params";

type Breed = {
    id: string;
    name: string;
};

const FILTER_SHEET_ID = "kennel-filter-sheet";

// Mobile triggers (search pill, Filters, Sort) live in different components,
// so they open the single sheet instance by id.
export function openFilterSheet(section?: "sort") {
    const dialog = document.getElementById(FILTER_SHEET_ID) as HTMLDialogElement | null;
    if (!dialog) return;
    dialog.showModal();
    if (section === "sort") {
        dialog.querySelector<HTMLInputElement>('[data-section="sort"] input:checked')?.focus();
    }
}

const PILL =
    "flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E7E2DA] bg-white px-4 py-2.25 text-[13px] font-medium text-[#44403C] has-checked:border-[#4F46E5] has-checked:bg-[#4F46E5] has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-[#4F46E5]/40";

const FIELD =
    "w-full rounded-xl border border-[#E7E2DA] bg-white px-3.5 py-3 text-sm font-medium text-[#1C1917] outline-none placeholder:text-[#A8A29E] focus:border-[#4F46E5]";

// Bottom sheet for <640px. Directory-Mobile.html only shows the trigger row,
// so the sheet reuses the design's chip, field and button styles.
export default function KennelFilterSheet({ breeds }: { breeds: Breed[] }) {
    const t = useTranslations("public.kennels");
    const dialog = useRef<HTMLDialogElement>(null);
    const { searchParams, buildQuery, navigate, sortUpdates, clear } = useDirectoryParams();

    const activeSort = effectiveSort(searchParams);

    const handleApply = async (formData: FormData) => {
        const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
        // If location access is denied for distance, keep the current sort.
        const sortChange = (await sortUpdates(formData.get("sort") as typeof activeSort)) ?? {};

        navigate(
            buildQuery({
                breed: text("breed"),
                location: text("location"),
                puppies: formData.get("puppies") ? "true" : null,
                verified: formData.get("verified") ? "true" : null,
                ...sortChange,
            }),
        );
        dialog.current?.close();
    };

    const handleClear = () => {
        clear();
        dialog.current?.close();
    };

    return (
        <dialog
            id={FILTER_SHEET_ID}
            ref={dialog}
            aria-labelledby={`${FILTER_SHEET_ID}-title`}
            // Clicking the backdrop (the dialog element itself) closes the sheet.
            onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
            className="mx-0 mt-auto mb-0 max-h-[85dvh] w-full max-w-none rounded-t-[20px] bg-white text-[#1C1917] backdrop:bg-[#1C1917]/40"
        >
            {/* key resets the uncontrolled fields whenever the URL changes */}
            <form key={searchParams.toString()} action={handleApply} className="flex flex-col gap-6 px-4.5 pt-5 pb-6">
                <div className="flex items-center justify-between">
                    <h2 id={`${FILTER_SHEET_ID}-title`} className="font-(family-name:--font-playfair) text-[19px] font-bold">
                        {t("sheet.title")}
                    </h2>
                    <button
                        type="button"
                        onClick={() => dialog.current?.close()}
                        aria-label={t("sheet.close")}
                        className="rounded-full p-1.5 text-[#44403C] hover:bg-[#F0ECE3]"
                    >
                        <X size={20} aria-hidden />
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-[#78716C] uppercase">{t("search.breedLabel")}</span>
                        <select name="breed" defaultValue={searchParams.get("breed") ?? ""} className={FIELD}>
                            <option value="">{t("search.anyBreed")}</option>
                            {breeds.map((breed) => (
                                <option key={breed.id} value={breed.name}>
                                    {breed.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-[#78716C] uppercase">{t("search.locationLabel")}</span>
                        <input
                            name="location"
                            defaultValue={searchParams.get("location") ?? ""}
                            placeholder={t("search.locationPlaceholder")}
                            className={FIELD}
                        />
                    </label>
                </div>

                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-3 text-xs font-semibold text-[#78716C] uppercase">{t("sheet.filtersHeading")}</legend>
                    <div className="flex flex-wrap gap-2.5">
                        <label className={PILL}>
                            <input type="checkbox" name="puppies" defaultChecked={searchParams.get("puppies") === "true"} className="sr-only" />
                            {t("filters.puppies")}
                        </label>
                        <label className={`group ${PILL}`}>
                            <input type="checkbox" name="verified" defaultChecked={searchParams.get("verified") === "true"} className="sr-only" />
                            <Check size={13} strokeWidth={2.5} className="text-[#166534] group-has-checked:text-white" aria-hidden />
                            {t("filters.verified")}
                        </label>
                    </div>
                </fieldset>

                <fieldset data-section="sort" className="flex flex-col gap-3">
                    <legend className="mb-3 text-xs font-semibold text-[#78716C] uppercase">{t("sheet.sortHeading")}</legend>
                    <div className="flex flex-wrap gap-2.5">
                        {KENNEL_SORTS.map((sort) => (
                            <label key={sort} className={PILL}>
                                <input type="radio" name="sort" value={sort} defaultChecked={sort === activeSort} className="sr-only" />
                                {t(`filters.sort.${sort}`)}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="flex items-center gap-3.5 border-t border-[#E7E2DA] pt-5">
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex-1 rounded-[10px] border border-[#E7E2DA] bg-white px-6 py-3.25 text-sm font-semibold text-[#1C1917]"
                    >
                        {t("sheet.clear")}
                    </button>
                    <button
                        type="submit"
                        className="flex-1 rounded-[10px] bg-[#4F46E5] px-6 py-3.25 text-sm font-semibold text-white hover:bg-[#4338CA]"
                    >
                        {t("sheet.apply")}
                    </button>
                </div>
            </form>
        </dialog>
    );
}
