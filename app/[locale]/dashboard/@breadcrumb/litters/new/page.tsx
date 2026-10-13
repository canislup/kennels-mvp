import { getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/dashboard/shell/Breadcrumb";

export default async function NewLitterBreadcrumb() {
    const t = await getTranslations("dashboard.litters");
    return <Breadcrumb items={[{ label: t("list.title"), href: "/dashboard/litters" }, { label: t("form.newLitterCrumb") }]} />;
}
