import { getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/dashboard/shell/Breadcrumb";

export default async function NewLeadBreadcrumb() {
    const t = await getTranslations("dashboard.leads");
    return <Breadcrumb items={[{ label: t("list.title"), href: "/dashboard/leads" }, { label: t("form.crumb") }]} />;
}
