import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getLitterDetail, getLitterForEdit, getLitterFormOptions } from "@/lib/dashboard/litters";
import { litterToFormValues } from "@/lib/dashboard/validation/litter";
import Button from "@/components/dashboard/ui/Button";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import LitterDangerZone from "@/components/dashboard/litters/LitterDangerZone";
import LitterForm from "@/components/dashboard/litters/LitterForm";
import { saveLitterAction } from "../../actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const [{ id }, kennel, t] = await Promise.all([params, getCurrentKennel(), getTranslations("dashboard.litters.form")]);
    const litter = kennel ? await getLitterForEdit(kennel.id, id) : null;
    return { title: litter ? t("editTitle", { name: litter.name }) : t("createTitle") };
}

export default async function EditLitterPage({ params }: Props) {
    const [{ id }, kennel] = await Promise.all([params, getCurrentKennel()]);
    if (!kennel) notFound();
    const [litter, detail, options, t] = await Promise.all([
        getLitterForEdit(kennel.id, id),
        getLitterDetail(kennel.id, id),
        getLitterFormOptions(kennel.id),
        getTranslations("dashboard.litters.form"),
    ]);
    if (!litter || !detail) notFound();

    return (
        <>
            <PageHeader
                title={t("editTitle", { name: litter.name })}
                subtitle={t("editSubtitle")}
                actions={
                    <Button href={`/dashboard/litters?litter=${litter.id}`} variant="ghost">
                        {t("viewLitter")}
                    </Button>
                }
            />
            <LitterForm
                mode="edit"
                action={saveLitterAction.bind(null, litter.id)}
                initialValues={litterToFormValues(litter)}
                options={options}
                dangerZone={<LitterDangerZone litterId={litter.id} litterName={litter.name} puppyCount={detail.puppies.length} />}
            />
        </>
    );
}
