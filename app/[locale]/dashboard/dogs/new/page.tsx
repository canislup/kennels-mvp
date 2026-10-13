import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getKennelBreeds, getLitterOptions } from "@/lib/dashboard/dogs";
import { getLitterDetail } from "@/lib/dashboard/litters";
import { dogToFormValues } from "@/lib/dashboard/validation/dog";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import DogForm from "@/components/dashboard/dogs/DogForm";
import { saveDogAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.dogs.form");
    return { title: t("createTitle") };
}

export default async function NewDogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const { litterId } = await searchParams;
    const [t, breeds, litters, litter] = await Promise.all([
        getTranslations("dashboard.dogs.form"),
        getKennelBreeds(kennel.id),
        getLitterOptions(kennel.id),
        // Only this kennel's litters prefill; anything else is ignored silently.
        typeof litterId === "string" ? getLitterDetail(kennel.id, litterId) : null,
    ]);

    // "Create a new puppy" from a litter: start as an available puppy of that litter.
    const initialValues = litter
        ? {
              ...dogToFormValues(null),
              lifeStage: "PUPPY",
              status: "AVAILABLE_PUPPY",
              litterId: litter.id,
              breed: breeds.some((b) => b.name === litter.breed) ? litter.breed : "",
              birthDate: litter.birthDate ?? "",
              damName: litter.damName ?? "",
              sireName: litter.sireName ?? "",
          }
        : dogToFormValues(null);

    return (
        <>
            <PageHeader title={t("createTitle")} subtitle={t("createSubtitle")} />
            <DogForm
                mode="create"
                action={saveDogAction.bind(null, null)}
                initialValues={initialValues}
                breeds={breeds.map((b) => b.name)}
                litters={litters}
                returnToLitter={Boolean(litter)}
            />
        </>
    );
}
