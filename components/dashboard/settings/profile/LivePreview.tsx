"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { KennelPublicPreview } from "@/lib/dashboard/kennelPreview";
import Card from "@/components/dashboard/ui/Card";

/**
 * A summary of the public page from the form's current values (unsaved
 * included). Not a copy of the real page, so it's labelled "Preview".
 * "Open page" opens the saved page in a new tab.
 */
export default function LivePreview({ preview, publicPagePath }: { preview: KennelPublicPreview; publicPagePath: string | null }) {
    const t = useTranslations("dashboard.settings.profile.preview");
    const format = useFormatter();
    const specialists = preview.breedNames.length > 0 ? t("specialists", { breeds: format.list(preview.breedNames, { type: "conjunction" }) }) : null;
    const subtitle = [preview.place, specialists].filter(Boolean).join(" · ");

    return (
        <Card as="section" padding="none" aria-labelledby="profile-preview-heading" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4.5">
                <h2 id="profile-preview-heading" className="font-display text-lg font-bold">
                    {t("heading")}
                </h2>
                {publicPagePath ? (
                    <Link href={publicPagePath} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:text-accent-hover">
                        {t("openPage")}
                        <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only">{t("newTab")}</span>
                    </Link>
                ) : (
                    <span className="text-[13px] font-semibold text-stone-500" title={t("noPage")}>
                        {t("openPage")}
                        <span className="sr-only">: {t("noPage")}</span>
                    </span>
                )}
            </div>
            <div className="h-27.5 bg-linear-135 from-sand-light to-sand-dark">
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL from the unsaved form, shown as is */}
                {preview.coverUrl && <img src={preview.coverUrl} alt="" className="size-full object-cover" />}
            </div>
            <div className="px-6 pb-6">
                {preview.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL from the unsaved form, shown as is
                    <img src={preview.logoUrl} alt="" className="relative -mt-9 size-18 rounded-2xl border-4 border-white bg-white object-cover" />
                ) : (
                    <div className="relative -mt-9 size-18 rounded-2xl border-4 border-white bg-linear-135 from-sand-light to-sand-dark" aria-hidden />
                )}
                <p className={`mt-3 mb-1 font-display text-2xl font-bold break-words ${preview.name ? "text-stone-900" : "text-stone-500"}`}>{preview.name || t("namePlaceholder")}</p>
                {subtitle && <p className="mb-3.5 text-[13px] text-stone-600">{subtitle}</p>}
                {preview.breedNames.length > 0 && (
                    <div className="mb-3.5 flex gap-4 overflow-hidden border-b border-line text-[13px]" aria-label={t("breedTabs")}>
                        {preview.breedNames.map((name, index) => (
                            <span key={name} className={`shrink-0 pb-2.5 ${index === 0 ? "border-b-2 border-stone-900 font-semibold" : "text-stone-500"}`}>
                                {name}
                            </span>
                        ))}
                    </div>
                )}
                <p className="text-[13px] leading-relaxed break-words text-stone-600">{preview.excerpt || <span className="text-stone-500">{t("descriptionPlaceholder")}</span>}</p>
                <p className="mt-4 text-xs text-stone-500">{t("note")}</p>
            </div>
        </Card>
    );
}
