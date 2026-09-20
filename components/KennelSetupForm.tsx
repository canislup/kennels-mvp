"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";

type Breed = {
    id: string;
    name: string;
};

export default function KennelSetupForm({ breeds }: { breeds: Breed[] }) {
    const router = useRouter();
    const t = useTranslations("dashboard.kennelSetup.form");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [breedSearch, setBreedSearch] = useState("");

    const filteredBreeds = breeds.filter((breed) =>
        breed.name.toLowerCase().includes(breedSearch.toLowerCase())
    );

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError("");

        const name = formData.get("name");
        const slug = formData.get("slug");
        const city = formData.get("city");
        const state = formData.get("state");
        const description = formData.get("description");
        const breedSelections = formData.getAll("breeds");

        try {
            const response = await fetch("/api/kennel", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    slug,
                    city,
                    state,
                    description,
                    breeds: breedSelections,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || t("errors.failed"));
                setIsLoading(false);
                return;
            }

            router.refresh();
            router.push("/dashboard");
        } catch (err) {
            console.error("Kennel Setup Error:", err);
            setError(t("errors.network"));
            setIsLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {t("nameLabel")}
                </label>
                <input
                    type="text"
                    name="name"
                    required
                    placeholder={t("namePlaceholder")}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {t("slugLabel")}
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all overflow-hidden">
                    <span className="pl-4 pr-1 text-sm text-slate-400 font-medium whitespace-nowrap">
                        {t("slugPrefix")}
                    </span>
                    <input
                        type="text"
                        name="slug"
                        required
                        placeholder={t("slugPlaceholder")}
                        className="flex-1 min-w-0 py-3 pr-4 outline-none"
                    />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                    {t("slugHelp")}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        {t("cityLabel")}
                    </label>
                    <input
                        type="text"
                        name="city"
                        required
                        placeholder={t("cityPlaceholder")}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        {t("stateLabel")}
                    </label>
                    <input
                        type="text"
                        name="state"
                        required
                        placeholder={t("statePlaceholder")}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {t("descriptionLabel")}
                </label>
                <textarea
                    name="description"
                    rows={4}
                    placeholder={t("descriptionPlaceholder")}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {t("breedsLabel")}
                </label>
                <div className="relative mb-2">
                    <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                    />
                    <input
                        type="text"
                        value={breedSearch}
                        onChange={(e) => setBreedSearch(e.target.value)}
                        placeholder={t("breedSearchPlaceholder")}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                </div>
                <div className="max-h-56 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    {filteredBreeds.length === 0 ? (
                        <p className="col-span-full text-sm text-slate-400 text-center py-4">
                            {t("noBreedMatch", { query: breedSearch })}
                        </p>
                    ) : (
                        filteredBreeds.map((breed) => (
                            <label
                                key={breed.id}
                                className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    name="breeds"
                                    value={breed.name}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                                />
                                {breed.name}
                            </label>
                        ))
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50"
            >
                {isLoading ? t("submitting") : t("submit")}
            </button>
        </form>
    );
}
