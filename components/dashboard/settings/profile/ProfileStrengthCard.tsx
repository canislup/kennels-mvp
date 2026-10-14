import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ProfileStrength, VerificationStatus } from "@/lib/dashboard/types";
import Card from "@/components/dashboard/ui/Card";
import ProgressBar from "@/components/dashboard/ui/ProgressBar";

/** From SAVED data (the page re-renders it after a save). Each missing item links to its section. */
export default async function ProfileStrengthCard({ strength, verificationStatus }: { strength: ProfileStrength; verificationStatus: VerificationStatus }) {
    const [t, format] = await Promise.all([getTranslations("dashboard.settings.profile.strength"), getFormatter()]);
    const percent = format.number(strength.percent / 100, { style: "percent" });

    return (
        <Card as="section" aria-labelledby="profile-strength-heading">
            <h2 id="profile-strength-heading" className="mb-3 font-display text-xl font-bold">
                {t("heading")}
            </h2>
            <div className="mb-3.5 flex items-center gap-3">
                <ProgressBar value={strength.percent} label={t("heading")} valueText={t("valueText", { percent })} className="flex-1" />
                <span className="text-[13px] font-semibold text-stone-900">{percent}</span>
            </div>
            {strength.missing.length > 0 && (
                <>
                    <p className="mb-2 text-[13px] font-semibold text-stone-700">{t("missingHeading")}</p>
                    <ul className="mb-4 flex flex-col gap-1.5">
                        {strength.missing.map((item) => (
                            <li key={item.key}>
                                <a href={item.href} className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-hover hover:underline">
                                    <ArrowRight className="size-3.5" aria-hidden />
                                    {t(`missing.${item.key}`)}
                                </a>
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {verificationStatus !== "APPROVED" && (
                <>
                    <p className="text-[13px] leading-relaxed text-stone-600">{t(`verification.${verificationStatus}`)}</p>
                    <Link href="/dashboard/settings/verification" className="mt-3 inline-block text-[13px] font-semibold text-accent hover:text-accent-hover">
                        {t("goToVerification")}
                    </Link>
                </>
            )}
        </Card>
    );
}
