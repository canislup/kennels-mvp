import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import SettingsTabs from "@/components/dashboard/settings/SettingsTabs";

/**
 * Settings shell: title, subtitle and the tab bar. Each tab is its own route
 * (/settings = Kennel profile, /settings/account, /notifications,
 * /verification); the page below renders the tab's content.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
    const t = await getTranslations("dashboard.settings");
    const tabs = [
        { segment: null, href: "/dashboard/settings", label: t("tabs.profile") },
        { segment: "account", href: "/dashboard/settings/account", label: t("tabs.account") },
        { segment: "notifications", href: "/dashboard/settings/notifications", label: t("tabs.notifications") },
        { segment: "verification", href: "/dashboard/settings/verification", label: t("tabs.verification") },
    ];
    return (
        <>
            <PageHeader title={t("title")} subtitle={t("subtitle")} />
            <SettingsTabs tabs={tabs} label={t("tabs.label")} />
            {/* Kennel profile is two columns: its page marks itself data-wide to lift the limit. */}
            <div className="max-w-215 has-[[data-wide]]:max-w-none">{children}</div>
        </>
    );
}
