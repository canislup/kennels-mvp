import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DogListItem } from "@/lib/dashboard/types";
import Badge from "@/components/dashboard/ui/Badge";
import StatusMenu from "./StatusMenu";
import { ageOf } from "./dogMeta";

export default async function DogCard({ dog, now }: { dog: DogListItem; now: Date }) {
    const t = await getTranslations("dashboard");
    const age = ageOf(dog.birthDate, now);
    const meta = [dog.breed, age && t(`common.age.${age.unit}`, { count: age.count }), dog.lifeStage === "PUPPY" && t("common.lifeStage.PUPPY")]
        .filter(Boolean)
        .join(" · ");

    return (
        <article className="flex flex-col rounded-2xl border border-line bg-white">
            <div className="h-42.5 overflow-hidden rounded-t-[15px] bg-linear-135 from-sand-light to-sand-dark">
                {dog.coverPhotoUrl ? (
                    <img src={dog.coverPhotoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                    <span className="sr-only">{t("dogs.list.noPhoto")}</span>
                )}
            </div>
            <div className="flex flex-1 flex-col p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate font-display text-[19px] font-bold text-stone-900">{dog.name}</h3>
                    <Badge tone={dog.sex === "MALE" ? "blue" : "pink"} className="shrink-0 px-2.5">
                        {t(`common.sex.${dog.sex}`)}
                    </Badge>
                </div>
                <p className="mb-3.5 text-[13px] text-stone-600">{meta}</p>
                <div className="mt-auto flex items-center justify-between gap-2">
                    <StatusMenu dogId={dog.id} dogName={dog.name} status={dog.status} />
                    <Link
                        href={`/dashboard/dogs/${dog.id}/edit`}
                        className="rounded text-[13px] font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {t("dogs.list.edit")}
                        <span className="sr-only"> {dog.name}</span>
                    </Link>
                </div>
            </div>
        </article>
    );
}
