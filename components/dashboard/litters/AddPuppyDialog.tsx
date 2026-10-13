"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { LinkablePuppy, SimpleMutationResult } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import Modal from "@/components/dashboard/ui/Modal";

/**
 * "Add or link puppy": link one of the kennel's unlinked puppies of this
 * breed, or go create a new one (prefilled with this litter).
 */
export default function AddPuppyDialog({
    litterId,
    breed,
    puppies,
    linkAction,
}: {
    litterId: string;
    breed: string;
    puppies: LinkablePuppy[];
    /** linkPuppyAction bound with the litter id. */
    linkAction: (dogId: string) => Promise<SimpleMutationResult>;
}) {
    const t = useTranslations("dashboard");
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const createHref = `/dashboard/dogs/new?litterId=${encodeURIComponent(litterId)}`;

    function close() {
        setOpen(false);
        setError(null);
    }

    function submit(formData: FormData) {
        const dogId = formData.get("dogId");
        if (typeof dogId !== "string" || !dogId) {
            setError(t("litters.linkDialog.pickOne"));
            return;
        }
        startTransition(async () => {
            const result = await linkAction(dogId);
            if (result.ok) close();
            else setError(t(`common.errors.${result.formError?.key ?? "generic"}`));
        });
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-accent-soft bg-accent-soft px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap text-accent hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
                <Plus className="size-4" aria-hidden />
                {t("litters.puppies.addOrLink")}
            </button>

            <Modal
                open={open}
                onClose={close}
                dismissible={!pending}
                title={t("litters.linkDialog.title")}
                description={puppies.length > 0 ? t("litters.linkDialog.description", { breed }) : t("litters.linkDialog.noneLinkable", { breed })}
            >
                {puppies.length > 0 && (
                    <form action={submit} className="mt-4">
                        <fieldset>
                            <legend className="mb-2 text-[13px] font-semibold text-stone-700">{t("litters.linkDialog.pickLabel")}</legend>
                            <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                                {puppies.map((puppy) => (
                                    <li key={puppy.id}>
                                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-stone-50 has-checked:bg-accent-soft">
                                            <input type="radio" name="dogId" value={puppy.id} className="size-4 accent-accent" />
                                            <span className="size-8 shrink-0 overflow-hidden rounded-lg bg-linear-135 from-sand-light to-sand-dark">
                                                {puppy.coverPhotoUrl && <img src={puppy.coverPhotoUrl} alt="" className="h-full w-full object-cover" />}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">{puppy.name}</span>
                                            <span className="text-xs text-stone-500">
                                                {t(`common.sex.${puppy.sex}`)} · {t(`common.dogStatus.${puppy.status}`)}
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </fieldset>
                        {error && (
                            <p role="alert" className="mt-3 text-sm font-medium text-status-red">
                                {error}
                            </p>
                        )}
                        <div className="mt-4 flex justify-end">
                            <Button type="submit" disabled={pending} aria-busy={pending}>
                                {pending ? t("litters.linkDialog.linking") : t("litters.linkDialog.link")}
                            </Button>
                        </div>
                    </form>
                )}

                <div className={`flex flex-wrap items-center justify-between gap-3 ${puppies.length > 0 ? "mt-5 border-t border-line pt-5" : "mt-5"}`}>
                    <p className="text-sm text-stone-600">{t("litters.linkDialog.createHelp")}</p>
                    <div className="flex gap-2.5">
                        <Button variant="secondary" onClick={close} disabled={pending}>
                            {t("litters.linkDialog.cancel")}
                        </Button>
                        <Button href={createHref} variant={puppies.length > 0 ? "secondary" : "primary"}>
                            {t("litters.linkDialog.createNew")}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
