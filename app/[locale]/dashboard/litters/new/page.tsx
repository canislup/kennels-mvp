import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getLitterFormOptions } from "@/lib/dashboard/litters";
import { litterToFormValues } from "@/lib/dashboard/validation/litter";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import LitterForm from "@/components/dashboard/litters/LitterForm";
import { saveLitterAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.litters.form");
    return { title: t("createTitle") };
}

export default async function NewLitterPage() {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const [t, options] = await Promise.all([getTranslations("dashboard.litters.form"), getLitterFormOptions(kennel.id)]);
    return (
        <>
            <PageHeader title={t("createTitle")} subtitle={t("createSubtitle")} />
            <LitterForm mode="create" action={saveLitterAction.bind(null, null)} initialValues={litterToFormValues(null)} options={options} />
        </>
    );
}
