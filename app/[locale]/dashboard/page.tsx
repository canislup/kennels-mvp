import { getLocale, getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { Dog, Baby, Store, ExternalLink, Plus, type LucideIcon } from "lucide-react";
import { verifyKennelSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
    const t = await getTranslations("dashboard.overview");

    const payload = await verifyKennelSession();
    if (!payload) {
        redirect({ href: "/login", locale: await getLocale() });
        return;
    }

    const ownerId = payload.userID as string;

    const kennel = await prisma.kennel.findUnique({
        where: { ownerId },
        select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { dogs: true } },
        },
    });

    // STATE A: No kennel linked yet — friendly onboarding hero.
    if (!kennel) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[80vh]">
                <div className="text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-10 sm:p-12 max-w-lg w-full">
                    <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <Dog className="text-indigo-600" size={30} />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900">
                        {t("onboarding.title")}
                    </h1>
                    <p className="text-slate-500 mt-3 font-medium">
                        {t("onboarding.description")}
                    </p>
                    <Link
                        href="/dashboard/kennel/setup"
                        className="mt-7 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3.5 rounded-xl transition-colors shadow-sm shadow-indigo-200"
                    >
                        <Plus size={18} />
                        {t("onboarding.cta")}
                    </Link>
                </div>
            </div>
        );
    }

    // STATE B: Kennel linked — standard overview.
    const activeLitterCount = await prisma.litter.count({
        where: { kennelId: kennel.id, status: { not: "SOLD_OUT" } },
    });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-10">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {t("heading")}
                </h2>
                <p className="text-slate-500 mt-2 font-medium text-sm">
                    {t("welcome", { kennelName: kennel.name })}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <MetricCard icon={Dog} label={t("metrics.totalDogs")} value={kennel._count.dogs} />
                <MetricCard icon={Baby} label={t("metrics.activeLitters")} value={activeLitterCount} />

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Store className="text-indigo-600" size={18} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                            {t("metrics.publicProfile")}
                        </span>
                    </div>
                    <Link
                        href={`/kennel/${kennel.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-sm break-all"
                    >
                        /kennel/{kennel.slug}
                        <ExternalLink size={14} className="shrink-0" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Icon className="text-indigo-600" size={18} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    {label}
                </span>
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{value}</p>
        </div>
    );
}
