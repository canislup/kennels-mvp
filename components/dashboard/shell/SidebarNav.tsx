"use client";

import { Heart, Image as ImageIcon, LayoutGrid, MessageSquare, PawPrint, Settings, Star, Users, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

// Icons are looked up here because components can't be passed from a Server
// Component to a Client Component as props.
const ICONS = {
    overview: LayoutGrid,
    dogs: PawPrint,
    litters: Heart,
    leads: Users,
    messages: MessageSquare,
    media: ImageIcon,
    reviews: Star,
    settings: Settings,
} satisfies Record<string, LucideIcon>;

export type SidebarNavItem = {
    key: keyof typeof ICONS;
    href: string;
    label: string;
    /** Count badge; hidden when 0. `badgeLabel` is its screen-reader text. */
    badge?: { count: number; label: string };
};

function isActive(pathname: string, href: string) {
    // Overview is only active on itself; sections also own their sub-routes.
    return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** The only client part of the sidebar: highlighting the active route. */
export default function SidebarNav({ items, label }: { items: SidebarNavItem[]; label: string }) {
    const pathname = usePathname();

    return (
        <nav aria-label={label} className="flex flex-col gap-1">
            {items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = ICONS[item.key];
                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.75 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                            active ? "bg-accent-soft text-accent" : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                        }`}
                    >
                        <Icon className="size-4.5 shrink-0" strokeWidth={1.8} aria-hidden />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && item.badge.count > 0 && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] leading-4 font-semibold text-white">
                                <span aria-hidden>{item.badge.count}</span>
                                <span className="sr-only">{item.badge.label}</span>
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
