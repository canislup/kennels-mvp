import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getLeadFormOptions, getLeadSummary } from "@/lib/dashboard/leads";
import { getViewerToday } from "@/lib/dashboard/viewerDate";
import { leadToFormValues } from "@/lib/dashboard/validation/lead";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import LeadForm from "@/components/dashboard/leads/LeadForm";
import { updateLeadAction } from "../../actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const [{ id }, kennel, t] = await Promise.all([params, getCurrentKennel(), getTranslations("dashboard.leads.form")]);
    const lead = kennel ? await getLeadSummary(kennel.id, id) : null;
    return { title: lead ? t("editTitle", { name: lead.name }) : undefined };
}

export default async function EditLeadPage({ params }: Props) {
    const [{ id }, kennel] = await Promise.all([params, getCurrentKennel()]);
    if (!kennel) notFound();
    const [lead, options, today, t] = await Promise.all([getLeadSummary(kennel.id, id), getLeadFormOptions(kennel.id), getViewerToday(), getTranslations("dashboard.leads.form")]);
    if (!lead) notFound();
    return (
        <>
            <PageHeader title={t("editTitle", { name: lead.name })} subtitle={t("editSubtitle")} />
            <LeadForm
                mode="edit"
                action={updateLeadAction.bind(null, lead.id)}
                initialValues={leadToFormValues(lead)}
                options={options}
                today={today}
                cancelHref={`/dashboard/leads/${lead.id}`}
            />
        </>
    );
}
