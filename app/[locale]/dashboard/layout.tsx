import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Sidebar from "@/components/Sidebar";
import { verifyKennelSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Best-effort lookup for the top bar's "View Public Profile" link — each
    // page still independently guards the session/redirect on its own.
    const t = await getTranslations("dashboard.layout");
    const payload = await verifyKennelSession();
    const kennel = payload
        ? await prisma.kennel.findUnique({
              where: { ownerId: payload.userID as string },
              select: { slug: true },
          })
        : null;

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar />

            <div className="flex-1 flex flex-col">
                <header className="h-16 flex items-center justify-end px-8 border-b border-slate-100 bg-white">
                    {kennel && (
                        <Link
                            href={`/kennel/${kennel.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-4 py-2 rounded-full transition-colors"
                        >
                            {t("viewPublicProfile")}
                            <ExternalLink size={14} />
                        </Link>
                    )}
                </header>

                <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
}
