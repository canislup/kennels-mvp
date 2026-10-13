import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getNotificationPreferences } from "@/lib/dashboard/notificationPreferences";
import { savePreferencesAction } from "./actions";
import NotificationPreferencesForm from "@/components/dashboard/settings/NotificationPreferencesForm";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.settings");
    return { title: `${t("tabs.notifications")} · ${t("title")}` };
}

export default async function NotificationSettingsPage() {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const prefs = await getNotificationPreferences(kennel.ownerId);
    return <NotificationPreferencesForm action={savePreferencesAction} initialValues={prefs} />;
}
