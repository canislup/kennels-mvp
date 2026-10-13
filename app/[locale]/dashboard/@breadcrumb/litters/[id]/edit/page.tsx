import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getLitterForEdit } from "@/lib/dashboard/litters";
import Breadcrumb from "@/components/dashboard/shell/Breadcrumb";

export default async function EditLitterBreadcrumb({ params }: { params: Promise<{ id: string }> }) {
    const [{ id }, kennel, t] = await Promise.all([params, getCurrentKennel(), getTranslations("dashboard.litters")]);
    const litter = kennel ? await getLitterForEdit(kennel.id, id) : null;
    if (!litter) return null;
    return <Breadcrumb items={[{ label: t("list.title"), href: `/dashboard/litters?litter=${litter.id}` }, { label: litter.name }]} />;
}
