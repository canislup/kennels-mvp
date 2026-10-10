import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getDogForEdit } from "@/lib/dashboard/dogs";
import Breadcrumb from "@/components/dashboard/shell/Breadcrumb";

export default async function EditDogBreadcrumb({ params }: { params: Promise<{ id: string }> }) {
    const [{ id }, kennel, t] = await Promise.all([params, getCurrentKennel(), getTranslations("dashboard.dogs")]);
    const dog = kennel ? await getDogForEdit(kennel.id, id) : null;
    if (!dog) return null;
    return <Breadcrumb items={[{ label: t("list.title"), href: "/dashboard/dogs" }, { label: dog.name }]} />;
}
