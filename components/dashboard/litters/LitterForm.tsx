"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { LitterFormState } from "@/app/[locale]/dashboard/litters/actions";
import type { FieldError, LitterFormOptions } from "@/lib/dashboard/types";
import { LITTER_LIMITS, type LitterFormValues } from "@/lib/dashboard/validation/litter";
import Card from "@/components/dashboard/ui/Card";
import Field from "@/components/dashboard/ui/Field";
import Notice from "@/components/dashboard/ui/Notice";
import SaveBar from "@/components/dashboard/ui/SaveBar";
import Select from "@/components/dashboard/ui/Select";
import TextInput from "@/components/dashboard/ui/TextInput";
import { LITTER_STATUS_ORDER } from "./litterMeta";

type SaveAction = (state: LitterFormState, formData: FormData) => Promise<LitterFormState>;

/**
 * New / Edit litter. Same pattern as DogForm: a native <form> posting to a
 * Server Action via useActionState, uncontrolled inputs remounted after each
 * submit. The only local state is the breed: the dam/sire selects only offer
 * adults of the chosen breed and remount (key={breed}) when it changes, which
 * clears a parent that no longer fits. They stay uncontrolled on purpose: a
 * controlled <select> has no default option, so React's post-action form
 * reset would blank it.
 */
export default function LitterForm({
    mode,
    action,
    initialValues,
    options,
    dangerZone,
}: {
    mode: "create" | "edit";
    action: SaveAction;
    initialValues: LitterFormValues;
    options: LitterFormOptions;
    dangerZone?: React.ReactNode;
}) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState(action, { status: "idle", values: initialValues, fieldErrors: {} });
    const values = state.values;
    const formRef = useRef<HTMLFormElement>(null);

    const [breed, setBreed] = useState(values.breed);
    const [seenSubmission, setSeenSubmission] = useState(state.submission);
    if (seenSubmission !== state.submission) {
        setSeenSubmission(state.submission);
        setBreed(state.values.breed);
    }

    const females = options.females.filter((dog) => dog.breed === breed);
    const males = options.males.filter((dog) => dog.breed === breed);
    // Keep the submitted parent only while its breed is selected.
    const parentDefault = (id: string, list: typeof females) => (list.some((dog) => dog.id === id) ? id : "");

    const message = (fieldError: FieldError | undefined) => (fieldError ? t(`common.errors.${fieldError.key}`, fieldError.params) : undefined);
    const error = (field: keyof LitterFormValues) => message(state.fieldErrors[field]);

    useEffect(() => {
        if (state.status !== "error") return;
        const target = formRef.current?.querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], [data-error-focus]');
        target?.focus();
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [state]);

    const parentPlaceholder = breed ? t("litters.form.noParent") : t("litters.form.chooseBreedFirst");

    return (
        <form ref={formRef} action={formAction} noValidate>
            {state.formError && (
                <div tabIndex={-1} data-error-focus className="mb-5 focus:outline-none">
                    <Notice tone="error" dismissible={false}>
                        {message(state.formError)}
                    </Notice>
                </div>
            )}

            <div key={state.submission ?? 0} className="flex max-w-3xl flex-col gap-6">
                <Card as="section" aria-labelledby="litter-basics">
                    <h2 id="litter-basics" className="mb-4.5 font-display text-xl font-bold">
                        {t("litters.form.sections.basics")}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
                        <Field id="litter-name" label={t("litters.form.fields.name")} help={t("litters.form.help.name")} error={error("name")} className="col-span-full">
                            {(control) => <TextInput {...control} name="name" defaultValue={values.name} placeholder={t("litters.form.placeholders.name")} autoComplete="off" />}
                        </Field>
                        <Field id="litter-breed" label={t("litters.form.fields.breed")} help={t("litters.form.help.breed")} error={error("breed")}>
                            {(control) => (
                                <Select {...control} name="breed" defaultValue={values.breed} onChange={(event) => setBreed(event.target.value)}>
                                    <option value="">{t("litters.form.placeholders.breed")}</option>
                                    {options.breeds.map((b) => (
                                        <option key={b.id} value={b.name}>
                                            {b.name}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </Field>
                        <Field id="litter-status" label={t("litters.form.fields.status")} help={t("litters.form.help.status")} error={error("status")}>
                            {(control) => (
                                <Select {...control} name="status" defaultValue={values.status}>
                                    {LITTER_STATUS_ORDER.map((status) => (
                                        <option key={status} value={status}>
                                            {t(`litters.status.${status}`)}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </Field>
                    </div>
                </Card>

                <Card as="section" aria-labelledby="litter-parents">
                    <h2 id="litter-parents" className="mb-4.5 font-display text-xl font-bold">
                        {t("litters.form.sections.parents")}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
                        <Field id="litter-dam" label={t("litters.form.fields.dam")} error={error("damId")}>
                            {(control) => (
                                <Select key={breed} {...control} name="damId" defaultValue={parentDefault(values.damId, females)} disabled={!breed}>
                                    <option value="">{parentPlaceholder}</option>
                                    {females.map((dog) => (
                                        <option key={dog.id} value={dog.id}>
                                            {dog.name}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </Field>
                        <Field id="litter-sire" label={t("litters.form.fields.sire")} error={error("sireId")}>
                            {(control) => (
                                <Select key={breed} {...control} name="sireId" defaultValue={parentDefault(values.sireId, males)} disabled={!breed}>
                                    <option value="">{parentPlaceholder}</option>
                                    {males.map((dog) => (
                                        <option key={dog.id} value={dog.id}>
                                            {dog.name}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </Field>
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500">
                        {breed && females.length + males.length === 0 ? t("litters.form.help.noAdults", { breed }) : t("litters.form.help.parents")}
                    </p>
                </Card>

                <Card as="section" aria-labelledby="litter-dates">
                    <h2 id="litter-dates" className="mb-4.5 font-display text-xl font-bold">
                        {t("litters.form.sections.dates")}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4.5">
                        <Field id="litter-birth" label={t("litters.form.fields.birthDate")} help={t("litters.form.help.birthDate")} error={error("birthDate")}>
                            {(control) => <TextInput {...control} type="date" name="birthDate" defaultValue={values.birthDate} max={new Date().toISOString().slice(0, 10)} />}
                        </Field>
                        <Field id="litter-go-home" label={t("litters.form.fields.expectedGoHomeDate")} error={error("expectedGoHomeDate")}>
                            {(control) => <TextInput {...control} type="date" name="expectedGoHomeDate" defaultValue={values.expectedGoHomeDate} />}
                        </Field>
                        <Field id="litter-count" label={t("litters.form.fields.puppyCount")} help={t("litters.form.help.puppyCount")} error={error("puppyCount")}>
                            {(control) => (
                                <TextInput {...control} type="number" inputMode="numeric" name="puppyCount" min={0} max={LITTER_LIMITS.puppyCount} step={1} defaultValue={values.puppyCount} />
                            )}
                        </Field>
                    </div>
                </Card>

                {dangerZone}
            </div>

            <SaveBar
                cancelHref="/dashboard/litters"
                submitLabel={mode === "create" ? t("litters.form.submitCreate") : t("litters.form.submitEdit")}
                pending={pending}
                saved={state.status === "saved"}
                resetKey={state.savedAt}
            />
        </form>
    );
}
