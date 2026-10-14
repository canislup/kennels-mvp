import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import Button from "@/components/dashboard/ui/Button";

/** Shown inside the dashboard shell for notFound() and unknown /dashboard/* URLs (see [...rest]). */
export default async function DashboardNotFound() {
    const t = await getTranslations("dashboard.boundaries.notFound");
    return (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white px-6 py-16 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
                <SearchX className="size-6" strokeWidth={1.8} />
            </div>
            <h1 className="font-display text-2xl font-bold text-stone-900">{t("title")}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">{t("description")}</p>
            <Button href="/dashboard" className="mt-6">
                {t("back")}
            </Button>
        </div>
    );
}
