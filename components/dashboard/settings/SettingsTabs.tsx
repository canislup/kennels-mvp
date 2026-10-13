"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { Link } from "@/i18n/navigation";

export type SettingsTab = { segment: string | null; href: string; label: string };

/**
 * The Settings tab bar: real routes, one link each. The only client part is
 * knowing the active tab (the child segment of settings/: null = Kennel
 * profile). Wraps on small screens instead of scrolling sideways.
 */
export default function SettingsTabs({ tabs, label }: { tabs: SettingsTab[]; label: string }) {
    const segment = useSelectedLayoutSegment();
    return (
        <nav aria-label={label} className="mb-7 border-b border-line">
            <ul className="-mb-px flex flex-wrap gap-x-1">
                {tabs.map((tab) => {
                    const active = tab.segment === segment;
                    return (
                        <li key={tab.href}>
                            <Link
                                href={tab.href}
                                aria-current={active ? "page" : undefined}
                                className={`block rounded-t-lg border-b-2 px-3.5 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:px-4.5 ${
                                    active ? "border-accent font-semibold text-accent" : "border-transparent font-medium text-stone-600 hover:border-line-strong hover:text-stone-900"
                                }`}
                            >
                                {tab.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
