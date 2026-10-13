import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getLeadSummary } from "@/lib/dashboard/leads";
import Breadcrumb from "@/components/dashboard/shell/Breadcrumb";

export default async function EditLeadBreadcrumb({ params }: { params: Promise<{ id: string }> }) {
    const [{ id }, kennel, t] = await Promise.all([params, getCurrentKennel(), getTranslations("dashboard.leads")]);
    const lead = kennel ? await getLeadSummary(kennel.id, id) : null;
    if (!lead) return null;
    return (
        <Breadcrumb
            items={[
                { label: t("list.title"), href: "/dashboard/leads" },
                { label: lead.name, href: `/dashboard/leads/${lead.id}` },
                { label: t("form.editCrumb") },
            ]}
        />
    );
}
