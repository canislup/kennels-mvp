import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getLeadFormOptions } from "@/lib/dashboard/leads";
import { getViewerToday } from "@/lib/dashboard/viewerDate";
import { EMPTY_LEAD_VALUES } from "@/lib/dashboard/validation/lead";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import LeadForm from "@/components/dashboard/leads/LeadForm";
import { createLeadAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.leads.form");
    return { title: t("title") };
}

export default async function NewLeadPage() {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const [t, options, today] = await Promise.all([getTranslations("dashboard.leads.form"), getLeadFormOptions(kennel.id), getViewerToday()]);
    return (
        <>
            <PageHeader title={t("title")} subtitle={t("subtitle")} />
            <LeadForm action={createLeadAction} initialValues={EMPTY_LEAD_VALUES} options={options} today={today} />
        </>
    );
}
