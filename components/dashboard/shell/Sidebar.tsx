import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { CurrentKennel, NavCounts } from "@/lib/dashboard/types";
import SidebarNav, { type SidebarNavItem } from "./SidebarNav";
import Wordmark from "./Wordmark";

/**
 * Sidebar contents (server-rendered). Used as the fixed desktop sidebar and,
 * below `lg`, inside the mobile drawer.
 */
export default async function Sidebar({ kennel, counts }: { kennel: CurrentKennel | null; counts: NavCounts }) {
    const t = await getTranslations("dashboard.shell");

    const items: SidebarNavItem[] = [
        { key: "overview", href: "/dashboard", label: t("nav.overview") },
        { key: "dogs", href: "/dashboard/dogs", label: t("nav.dogs") },
        { key: "litters", href: "/dashboard/litters", label: t("nav.litters") },
        {
            key: "leads",
            href: "/dashboard/leads",
            label: t("nav.leads"),
            badge: { count: counts.newLeads, label: t("nav.newLeadsBadge", { count: counts.newLeads }) },
        },
        {
            key: "messages",
            href: "/dashboard/messages",
            label: t("nav.messages"),
            badge: { count: counts.unreadMessages, label: t("nav.unreadMessagesBadge", { count: counts.unreadMessages }) },
        },
        { key: "media", href: "/dashboard/media", label: t("nav.media") },
        { key: "reviews", href: "/dashboard/reviews", label: t("nav.reviews") },
        { key: "settings", href: "/dashboard/settings", label: t("nav.settings") },
    ];

    return (
        <div className="flex h-full flex-col gap-6 px-4 py-6">
            <div className="px-2">
                <Wordmark />
            </div>

            <SidebarNav items={items} label={t("nav.label")} />

            <div className="flex-1" />

            {kennel && (
                <div className="flex flex-col gap-2.5 rounded-xl border border-line p-3.5">
                    <div className="flex items-center gap-2.5">
                        {kennel.logoUrl ? (
                            <img src={kennel.logoUrl} alt="" className="size-9 shrink-0 rounded-[10px] object-cover" />
                        ) : (
                            <div className="size-9 shrink-0 rounded-[10px] bg-linear-135 from-sand-light to-sand-dark" aria-hidden />
                        )}
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-stone-900">{kennel.name}</div>
                            <div className="truncate text-xs text-stone-500">{[kennel.city, kennel.state].filter(Boolean).join(", ")}</div>
                        </div>
                    </div>
                    <Link
                        href={`/kennel/${kennel.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="self-start rounded text-[13px] font-medium text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {t("viewPublicPage")}
                        <span className="sr-only"> {t("opensInNewTab")}</span>
                    </Link>
                </div>
            )}

            <div className="flex items-center gap-2.5 px-1">
                {kennel && (
                    <div
                        className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[13px] font-semibold text-stone-50"
                        aria-hidden
                    >
                        {kennel.ownerInitials}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    {kennel && <div className="truncate text-[13px] font-semibold text-stone-900">{kennel.ownerName}</div>}
                    {/* TODO(auth): wire up sign-out (clear the kennel_session cookie, redirect to /login). Intentionally left for the backend work. */}
                    <button
                        type="button"
                        className="rounded text-xs text-stone-500 hover:text-stone-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {t("signOut")}
                    </button>
                </div>
            </div>
        </div>
    );
}
