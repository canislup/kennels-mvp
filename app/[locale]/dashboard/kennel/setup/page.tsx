import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { verifyKennelSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import KennelSetupForm from "@/components/KennelSetupForm";

export default async function KennelSetupPage() {
    const locale = await getLocale();
    const t = await getTranslations("dashboard.kennelSetup.page");

    const payload = await verifyKennelSession();
    if (!payload) {
        redirect({ href: "/login", locale });
        return;
    }

    const ownerId = payload.userID as string;

    const [existingKennel, breeds] = await Promise.all([
        prisma.kennel.findUnique({ where: { ownerId } }),
        prisma.breed.findMany({ orderBy: { name: "asc" } }),
    ]);

    // Already set up — no reason to re-create, send them to the dashboard.
    if (existingKennel) {
        redirect({ href: "/dashboard", locale });
        return;
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {t("heading")}
                </h1>
                <p className="text-slate-500 mt-2 font-medium text-sm">
                    {t("subheading")}
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <KennelSetupForm breeds={breeds} />
            </div>
        </div>
    );
}
