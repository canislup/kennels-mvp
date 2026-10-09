import { getTranslations } from "next-intl/server";
import { Hammer } from "lucide-react";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import PageHeader from "./ui/PageHeader";

export type PlaceholderSection = "litters" | "leads" | "messages" | "media" | "reviews" | "settings";

/** Temporary page for sidebar sections whose redesign step hasn't landed yet. */
export default async function SectionPlaceholder({ section }: { section: PlaceholderSection }) {
    const [tNav, t] = await Promise.all([getTranslations("dashboard.shell.nav"), getTranslations("dashboard.common.placeholder")]);
    return (
        <>
            <PageHeader title={tNav(section)} />
            <EmptyState
                icon={<Hammer className="size-6" strokeWidth={1.8} />}
                title={t("title")}
                description={t("description")}
                action={
                    <Button href="/dashboard" variant="secondary">
                        {t("back")}
                    </Button>
                }
            />
        </>
    );
}
