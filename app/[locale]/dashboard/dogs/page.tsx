import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { verifyKennelSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DogCard from "@/components/DogCard";
import AddDogModal from "@/components/AddDogModal";

export default async function DogsPage() {
    const locale = await getLocale();
    const t = await getTranslations("dashboard.dogs.page");

    const payload = await verifyKennelSession();
    if (!payload) {
        redirect({ href: "/login", locale });
        return;
    }

    const ownerId = payload.userID as string;

    // Every dog fetched/created here is strictly scoped to this owner's
    // kennel — new dogs are always linked via kennel.id (see /api/dogs).
    const [kennel, breeds] = await Promise.all([
        prisma.kennel.findUnique({
            where: { ownerId },
            include: { dogs: { orderBy: { createdAt: "desc" } } },
        }),
        prisma.breed.findMany({ orderBy: { name: "asc" } }),
    ]);

    // No kennel yet — dogs can't be created without one.
    if (!kennel) {
        redirect({ href: "/dashboard/kennel/setup", locale });
        return;
    }

    const dogs = kennel.dogs;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {t("heading")}
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium text-sm">
                        {t("subheading", { kennelName: kennel.name })}
                    </p>
                </div>
                <AddDogModal availableBreeds={breeds} />
            </div>

            {dogs.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">{t("emptyTitle")}</h3>
                    <p className="text-slate-500 font-medium mt-1">
                        {t("emptyDescription")}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {dogs.map((dog) => (
                        <DogCard key={dog.id} dog={dog} />
                    ))}
                </div>
            )}
        </div>
    );
}
