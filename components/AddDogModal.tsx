"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, ImagePlus } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";

type Breed = {
    id: string;
    name: string;
};

export default function AddDogModal({ availableBreeds }: { availableBreeds: Breed[] }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // NEW: State to hold the uploaded image URLs
    const [photoUrls, setPhotoUrls] = useState<string[]>([]);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError("");

        const name = formData.get("name");
        const breed = formData.get("breed");
        const gender = formData.get("gender");

        try {
            // NEW: Added photoUrls to the payload
            const response = await fetch("/api/dogs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, breed, gender, photoUrls }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Failed to create dog profile.");
                setIsLoading(false);
                return;
            }

            // Reset state on success
            setPhotoUrls([]);
            setIsOpen(false);
            router.refresh();

        } catch (err) {
            console.error(err);
            setError("A network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
            >
                <Plus className="w-5 h-5" /> Add New Profile
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-900">New Dog Profile</h3>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setPhotoUrls([]); // clear photos if they cancel
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form action={handleSubmit} className="p-6 space-y-5">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            {/* --- NEW: Image Upload Section --- */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    Imagens
                                </label>

                                {/* Cloudinary Widget */}
                                <CldUploadWidget
                                    uploadPreset="kennel_app_preset" // 🚨 SEE STEP 2 BELOW
                                    onSuccess={(result: any) => {
                                        if (result.info?.secure_url) {
                                            setPhotoUrls((prev) => [...prev, result.info.secure_url]);
                                        }
                                    }}
                                >
                                    {({ open }) => (
                                        <button
                                            type="button"
                                            onClick={() => open()}
                                            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-600"
                                        >
                                            <ImagePlus className="w-6 h-6" />
                                            <span className="text-sm font-medium">Adicionar imagens</span>
                                        </button>
                                    )}
                                </CldUploadWidget>

                                {/* Preview the uploaded images */}
                                {photoUrls.length > 0 && (
                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                                        {photoUrls.map((url, idx) => (
                                            <img
                                                key={idx}
                                                src={url}
                                                alt="Uploaded preview"
                                                className="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-sm"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* --- END IMAGE UPLOAD SECTION --- */}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="e.g., Bella"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    Breed
                                </label>
                                <select
                                    name="breed"
                                    required
                                    defaultValue=""
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all bg-white"
                                >
                                    <option value="" disabled>Select a breed...</option>
                                    {availableBreeds.map((b) => (
                                        <option key={b.id} value={b.name}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    Gender
                                </label>
                                <select
                                    name="gender"
                                    required
                                    defaultValue=""
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all bg-white"
                                >
                                    <option value="" disabled>Select gender</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        setPhotoUrls([]);
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? "Saving..." : "Create Profile"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}