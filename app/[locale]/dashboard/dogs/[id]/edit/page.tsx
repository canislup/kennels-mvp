import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getDogForEdit, getKennelBreeds, getLitterOptions } from "@/lib/dashboard/dogs";
import { dogToFormValues } from "@/lib/dashboard/validation/dog";
import Notice from "@/components/dashboard/ui/Notice";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import DangerZone from "@/components/dashboard/dogs/DangerZone";
import DogForm from "@/components/dashboard/dogs/DogForm";
import SubmitButton from "@/components/dashboard/ui/SubmitButton";
import { restoreDogAction, saveDogAction } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const [{ id }, kennel, t] = await Promise.all([params, getCurrentKennel(), getTranslations("dashboard.dogs.form")]);
    const dog = kennel ? await getDogForEdit(kennel.id, id) : null;
    return { title: dog ? t("editTitle", { name: dog.name }) : t("createTitle") };
}

export default async function EditDogPage({ params, searchParams }: Props) {
    const [{ id }, kennel, query] = await Promise.all([params, getCurrentKennel(), searchParams]);
    if (!kennel) notFound();
    const [dog, t, breeds, litters] = await Promise.all([
        getDogForEdit(kennel.id, id),
        getTranslations("dashboard.dogs.form"),
        getKennelBreeds(kennel.id),
        getLitterOptions(kennel.id),
    ]);
    if (!dog) notFound();

    return (
        <>
            <PageHeader
                title={t("editTitle", { name: dog.name })}
                subtitle={t("editSubtitle")}
                actions={
                    <Link
                        href={`/kennel/${kennel.slug}/dog/${dog.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded py-2.75 text-sm font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {t("previewPublic")}
                        <span className="sr-only"> {t("opensInNewTab")}</span>
                    </Link>
                }
            />
            {query?.notice === "restored" && !dog.archivedAt && (
                <Notice tone="success" clearParam="notice" className="mb-5">
                    {t("restoredNotice", { name: dog.name })}
                </Notice>
            )}
            {dog.archivedAt && (
                <Notice tone="warning" dismissible={false} className="mb-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>{t("archivedNotice", { name: dog.name })}</span>
                        {/* A separate form: it can't be nested inside the dog form below. */}
                        <form action={restoreDogAction.bind(null, dog.id, "edit")}>
                            <SubmitButton variant="secondary" className="px-3.5 py-1.5 text-xs" pendingLabel={t("restoring")}>
                                {t("restore")}
                            </SubmitButton>
                        </form>
                    </div>
                </Notice>
            )}
            <DogForm
                mode="edit"
                action={saveDogAction.bind(null, dog.id)}
                initialValues={dogToFormValues(dog)}
                breeds={breeds.map((b) => b.name)}
                litters={litters}
                dangerZone={<DangerZone dogId={dog.id} dogName={dog.name} archived={Boolean(dog.archivedAt)} />}
            />
        </>
    );
}
