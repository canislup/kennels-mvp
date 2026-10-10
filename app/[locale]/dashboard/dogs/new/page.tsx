import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getKennelBreeds, getLitterOptions } from "@/lib/dashboard/dogs";
import { dogToFormValues } from "@/lib/dashboard/validation/dog";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import DogForm from "@/components/dashboard/dogs/DogForm";
import { saveDogAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.dogs.form");
    return { title: t("createTitle") };
}

export default async function NewDogPage() {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const [t, breeds, litters] = await Promise.all([getTranslations("dashboard.dogs.form"), getKennelBreeds(kennel.id), getLitterOptions(kennel.id)]);

    return (
        <>
            <PageHeader title={t("createTitle")} subtitle={t("createSubtitle")} />
            <DogForm
                mode="create"
                action={saveDogAction.bind(null, null)}
                initialValues={dogToFormValues(null)}
                breeds={breeds.map((b) => b.name)}
                litters={litters}
            />
        </>
    );
}
