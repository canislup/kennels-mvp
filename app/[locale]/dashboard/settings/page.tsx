import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hammer } from "lucide-react";
import EmptyState from "@/components/dashboard/ui/EmptyState";

// Kennel profile tab: placeholder until Step 6b rebuilds it.
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.settings");
    return { title: `${t("tabs.profile")} · ${t("title")}` };
}

export default async function KennelProfileSettingsPage() {
    const t = await getTranslations("dashboard.settings.profile");
    return <EmptyState icon={<Hammer className="size-6" strokeWidth={1.8} />} title={t("title")} description={t("description")} />;
}
