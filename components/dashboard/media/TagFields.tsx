"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { MediaFilterOptions } from "@/lib/dashboard/types";
import Select from "@/components/dashboard/ui/Select";

/**
 * Breed + dog selects for tagging media. The dog list narrows to the chosen
 * breed (the select remounts when it changes, clearing a dog that no longer
 * fits); picking a dog with no breed is fine, the server sets the breed.
 */
export default function TagFields({
    idPrefix,
    options,
    defaultBreed,
    defaultDogId,
    error,
}: {
    idPrefix: string;
    options: MediaFilterOptions;
    defaultBreed?: string | null;
    defaultDogId?: string | null;
    error: (field: string) => string | undefined;
}) {
    const t = useTranslations("dashboard.media.tags");
    const [breed, setBreed] = useState(defaultBreed ?? "");
    const dogs = options.dogs.filter((dog) => !breed || dog.breed === breed);
    const keptDog = defaultDogId && dogs.some((dog) => dog.id === defaultDogId) ? defaultDogId : "";

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <label htmlFor={`${idPrefix}-breed`} className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                    {t("breed")}
                </label>
                <Select
                    id={`${idPrefix}-breed`}
                    name="breed"
                    defaultValue={breed}
                    onChange={(event) => setBreed(event.target.value)}
                    aria-invalid={error("breed") ? true : undefined}
                    aria-describedby={error("breed") ? `${idPrefix}-breed-error` : undefined}
                >
                    <option value="">{t("allBreeds")}</option>
                    {options.breeds.map((b) => (
                        <option key={b.id} value={b.name}>
                            {b.name}
                        </option>
                    ))}
                </Select>
                {error("breed") && (
                    <p id={`${idPrefix}-breed-error`} className="mt-1.5 text-xs font-medium text-status-red">
                        {error("breed")}
                    </p>
                )}
            </div>
            <div>
                <label htmlFor={`${idPrefix}-dog`} className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                    {t("dog")}
                </label>
                <Select
                    key={breed}
                    id={`${idPrefix}-dog`}
                    name="dogId"
                    defaultValue={keptDog}
                    aria-invalid={error("dogId") ? true : undefined}
                    aria-describedby={error("dogId") ? `${idPrefix}-dog-error` : undefined}
                >
                    <option value="">{t("wholeKennel")}</option>
                    {dogs.map((dog) => (
                        <option key={dog.id} value={dog.id}>
                            {dog.name}
                        </option>
                    ))}
                </Select>
                {error("dogId") && (
                    <p id={`${idPrefix}-dog-error`} className="mt-1.5 text-xs font-medium text-status-red">
                        {error("dogId")}
                    </p>
                )}
            </div>
        </div>
    );
}
