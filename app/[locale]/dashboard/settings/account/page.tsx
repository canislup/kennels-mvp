import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getAccount } from "@/lib/dashboard/account";
import type { AppLocale } from "@/lib/dashboard/types";
import { saveAccountAction } from "./actions";
import Notice from "@/components/dashboard/ui/Notice";
import AccountDetailsForm from "@/components/dashboard/settings/AccountDetailsForm";
import DeleteAccount from "@/components/dashboard/settings/DeleteAccount";
import PasswordForm from "@/components/dashboard/settings/PasswordForm";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.settings");
    return { title: `${t("tabs.account")} · ${t("title")}` };
}

/** Three separate forms: details, password, danger zone (each with its own result). */
export default async function AccountSettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const [account, locale, t, { notice }] = await Promise.all([getAccount(kennel.ownerId), getLocale(), getTranslations("dashboard.settings.account"), searchParams]);
    if (!account) notFound();

    return (
        <div className="flex flex-col gap-6">
            {notice === "saved" && (
                <Notice tone="success" clearParam="notice">
                    {t("details.saved")}
                </Notice>
            )}
            {/* The language select shows the language on screen (the URL decides it; the EN | PT switcher can change it without saving). */}
            <AccountDetailsForm action={saveAccountAction} initialValues={{ ...account, locale: locale as AppLocale }} />
            <PasswordForm email={account.email} />
            <DeleteAccount kennelName={kennel.name} />
        </div>
    );
}
