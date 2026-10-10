import { getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/dashboard/shell/Breadcrumb";

export default async function NewDogBreadcrumb() {
    const t = await getTranslations("dashboard.dogs");
    return <Breadcrumb items={[{ label: t("list.title"), href: "/dashboard/dogs" }, { label: t("form.newDogCrumb") }]} />;
}
