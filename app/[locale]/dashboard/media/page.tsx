import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

// Placeholder until this section's redesign step replaces it.
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.shell.nav");
    return { title: t("media") };
}

export default function MediaPage() {
    return <SectionPlaceholder section="media" />;
}
