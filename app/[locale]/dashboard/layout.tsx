import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { verifyKennelSession } from "@/lib/auth";
import { dashboardFontClasses } from "@/lib/fonts";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getNavCounts, getNotifications } from "@/lib/dashboard/shell";
import type { DashboardNotification, NavCounts } from "@/lib/dashboard/types";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Sidebar from "@/components/dashboard/shell/Sidebar";
import MobileNav from "@/components/dashboard/shell/MobileNav";
import NotificationsBell from "@/components/dashboard/shell/NotificationsBell";
import Wordmark from "@/components/dashboard/shell/Wordmark";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.shell.metadata");
    return { title: { template: t("titleTemplate"), default: t("defaultTitle") }, robots: { index: false } };
}

const NO_COUNTS: NavCounts = { newLeads: 0, unreadMessages: 0 };

export default async function DashboardLayout({ children, breadcrumb }: { children: React.ReactNode; breadcrumb: React.ReactNode }) {
    const session = await verifyKennelSession();
    if (!session) {
        redirect({ href: "/login", locale: await getLocale() });
    }

    const t = await getTranslations("dashboard.shell");
    // Null until the owner finishes kennel setup; the shell still renders so
    // /dashboard/kennel/setup works inside it.
    const kennel = await getCurrentKennel();
    const [counts, notifications]: [NavCounts, DashboardNotification[]] = kennel
        ? await Promise.all([getNavCounts(kennel.id), getNotifications(kennel.id)])
        : [NO_COUNTS, []];

    const sidebar = <Sidebar kennel={kennel} counts={counts} />;

    return (
        <div className={`${dashboardFontClasses} flex min-h-screen flex-1 bg-white text-stone-900`}>
            <a
                href="#dashboard-main"
                className="sr-only rounded-xl bg-white px-4 py-2 text-sm font-semibold text-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:outline-2 focus:outline-accent"
            >
                {t("skipToContent")}
            </a>

            <aside className="sticky top-0 hidden h-screen w-62 shrink-0 overflow-y-auto border-r border-line bg-white lg:block">
                {sidebar}
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="group/topbar sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white px-4 sm:px-6 lg:static lg:h-18 lg:border-b-0 lg:px-10">
                    <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
                        <MobileNav>{sidebar}</MobileNav>
                        {/* On mobile the page's breadcrumb, when there is one, takes the wordmark's place. */}
                        <Wordmark className="text-xl group-has-[[data-breadcrumb]]/topbar:hidden" />
                    </div>
                    {/* Filled by the @breadcrumb parallel route; empty on pages without one. */}
                    <div className="min-w-0 flex-1">{breadcrumb}</div>
                    <div className="flex shrink-0 items-center gap-3">
                        <LocaleSwitcher tone="dashboard" />
                        <NotificationsBell notifications={notifications} />
                    </div>
                </header>

                <main id="dashboard-main" className="min-w-0 flex-1 px-4 pt-6 pb-14 sm:px-6 lg:px-10 lg:pt-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
