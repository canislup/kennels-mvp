"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { DogFormState } from "@/app/[locale]/dashboard/dogs/actions";
import type { FieldError, LitterOption } from "@/lib/dashboard/types";
import { DOG_LIMITS, type DogFormValues } from "@/lib/dashboard/validation/dog";
import Card from "@/components/dashboard/ui/Card";
import Field from "@/components/dashboard/ui/Field";
import Notice from "@/components/dashboard/ui/Notice";
import SaveBar from "@/components/dashboard/ui/SaveBar";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import Select from "@/components/dashboard/ui/Select";
import TextInput from "@/components/dashboard/ui/TextInput";
import Textarea from "@/components/dashboard/ui/Textarea";
import HealthDocuments from "./HealthDocuments";
import PhotoManager from "./PhotoManager";
import { STATUS_ORDER } from "./dogMeta";

type SaveAction = (state: DogFormState, formData: FormData) => Promise<DogFormState>;

/**
 * Dog-Edit / Add dog form. A native <form> posting to a Server Action via
 * useActionState: inputs are uncontrolled (defaultValue from the last
 * submitted values, so nothing is lost on a validation error); only the
 * composite controls below keep local state.
 */
export default function DogForm({
    mode,
    action,
    initialValues,
    breeds,
    litters,
    dangerZone,
    returnToLitter = false,
}: {
    mode: "create" | "edit";
    /** saveDogAction, bound on the server with the dog id (null for create). */
    action: SaveAction;
    initialValues: DogFormValues;
    breeds: string[];
    litters: LitterOption[];
    /** Archive/delete card, rendered by the page on edit. */
    dangerZone?: React.ReactNode;
    /** Opened from a litter ("Create a new puppy"): after create, go back to that litter. */
    returnToLitter?: boolean;
}) {
    const t = useTranslations("dashboard");
    const format = useFormatter();
    const [state, formAction, pending] = useActionState(action, { status: "idle", values: initialValues, fieldErrors: {} });
    const values = state.values;
    const formRef = useRef<HTMLFormElement>(null);

    // The life stage / litter pair: the litter selector only exists for
    // puppies, and switching to Adult clears it.
    const [lifeStage, setLifeStage] = useState(values.lifeStage);
    // "" once the user switches to Adult (clears the litter); otherwise the submitted value is the default.
    const [litterOverride, setLitterOverride] = useState<string | null>(null);
    const [seenSubmission, setSeenSubmission] = useState(state.submission);
    if (seenSubmission !== state.submission) {
        setSeenSubmission(state.submission);
        setLitterOverride(null);
        setLifeStage(state.values.lifeStage);
    }

    const error = (field: keyof DogFormValues) => message(state.fieldErrors[field]);
    function message(fieldError: FieldError | undefined) {
        return fieldError ? t(`common.errors.${fieldError.key}`, fieldError.params) : undefined;
    }

    // After a failed submit, move focus to the first invalid field (in page order).
    useEffect(() => {
        if (state.status !== "error") return;
        const target = formRef.current?.querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"], [data-error-focus]');
        target?.focus();
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [state]);

    const statusOptions = STATUS_ORDER.map((status) => ({ value: status, label: t(`common.dogStatusOption.${status}`) }));

    return (
        <form ref={formRef} action={formAction} noValidate>
            {state.formError && (
                <div tabIndex={-1} data-error-focus className="mb-5 focus:outline-none">
                    <Notice tone="error" dismissible={false}>
                        {message(state.formError)}
                    </Notice>
                </div>
            )}

            {/* Remounted after each submit so every field shows the submitted values (see DogFormState.submission). */}
            <div key={state.submission ?? 0} className="flex flex-wrap items-start gap-6">
                <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-6">
                    <Card as="section" aria-labelledby="dog-basics">
                        <h2 id="dog-basics" className="mb-4.5 font-display text-xl font-bold">
                            {t("dogs.form.sections.basics")}
                        </h2>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
                            <Field id="dog-name" label={t("dogs.form.fields.name")} error={error("name")}>
                                {(control) => <TextInput {...control} name="name" defaultValue={values.name} autoComplete="off" required />}
                            </Field>
                            <Field id="dog-breed" label={t("dogs.form.fields.breed")} help={t("dogs.form.help.breed")} error={error("breed")}>
                                {(control) => (
                                    <Select {...control} name="breed" defaultValue={values.breed} required>
                                        <option value="">{t("dogs.form.placeholders.breed")}</option>
                                        {breeds.map((breed) => (
                                            <option key={breed} value={breed}>
                                                {breed}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </Field>
                            <Field as="fieldset" id="dog-sex" label={t("dogs.form.fields.sex")} error={error("sex")}>
                                {(control) => (
                                    <SegmentedControl
                                        name="sex"
                                        control={control}
                                        defaultValue={values.sex}
                                        options={[
                                            { value: "MALE", label: t("common.sex.MALE") },
                                            { value: "FEMALE", label: t("common.sex.FEMALE") },
                                        ]}
                                    />
                                )}
                            </Field>
                            <Field as="fieldset" id="dog-stage" label={t("dogs.form.fields.lifeStage")} error={error("lifeStage")}>
                                {(control) => (
                                    <SegmentedControl
                                        name="lifeStage"
                                        control={control}
                                        value={lifeStage}
                                        onValueChange={(next) => {
                                            setLifeStage(next);
                                            if (next !== "PUPPY") setLitterOverride("");
                                        }}
                                        options={[
                                            { value: "PUPPY", label: t("common.lifeStage.PUPPY") },
                                            { value: "ADULT", label: t("common.lifeStage.ADULT") },
                                        ]}
                                    />
                                )}
                            </Field>
                            <Field id="dog-birth" label={t("dogs.form.fields.birthDate")} help={t("dogs.form.help.birthDate")} error={error("birthDate")}>
                                {(control) => <TextInput {...control} type="date" name="birthDate" defaultValue={values.birthDate} max={new Date().toISOString().slice(0, 10)} />}
                            </Field>
                            <Field id="dog-status" label={t("dogs.form.fields.status")} error={error("status")}>
                                {(control) => (
                                    <Select {...control} name="status" defaultValue={values.status}>
                                        {statusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </Field>
                        </div>

                        {lifeStage === "PUPPY" && (
                            <div className="mt-4.5 rounded-xl border border-accent-soft bg-accent-soft p-4">
                                <Field id="dog-litter" label={t("dogs.form.fields.litter")} help={t("dogs.form.help.litter")} error={error("litterId")}>
                                    {(control) => (
                                        <Select {...control} name="litterId" defaultValue={litterOverride ?? values.litterId}>
                                            <option value="">{t("dogs.form.noLitter")}</option>
                                            {litters.map((litter) => (
                                                <option key={litter.id} value={litter.id}>
                                                    {litter.bornAt
                                                        ? t("dogs.form.litterBorn", { label: litter.label, date: format.dateTime(new Date(litter.bornAt), { dateStyle: "medium" }) })
                                                        : t("dogs.form.litterPlanned", { label: litter.label })}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                </Field>
                            </div>
                        )}
                    </Card>

                    <Card as="section" aria-labelledby="dog-registry">
                        <h2 id="dog-registry" className="mb-4.5 font-display text-xl font-bold">
                            {t("dogs.form.sections.registry")}
                        </h2>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
                            <Field id="dog-registry-name" label={t("dogs.form.fields.registry")} error={error("registry")}>
                                {(control) => <TextInput {...control} name="registry" defaultValue={values.registry} placeholder={t("dogs.form.placeholders.registry")} />}
                            </Field>
                            <Field id="dog-registration-number" label={t("dogs.form.fields.registrationNumber")} error={error("registrationNumber")}>
                                {(control) => (
                                    <TextInput
                                        {...control}
                                        name="registrationNumber"
                                        defaultValue={values.registrationNumber}
                                        placeholder={t("dogs.form.placeholders.registrationNumber")}
                                        autoComplete="off"
                                    />
                                )}
                            </Field>
                            <Field id="dog-lineage" label={t("dogs.form.fields.lineage")} help={t("dogs.form.help.lineage")} error={error("lineage")}>
                                {(control) => <TextInput {...control} name="lineage" defaultValue={values.lineage} />}
                            </Field>
                        </div>
                        <Field id="dog-pedigree" label={t("dogs.form.fields.pedigreeUrl")} error={error("pedigreeUrl")} className="mt-4.5">
                            {(control) => <TextInput {...control} type="url" inputMode="url" name="pedigreeUrl" defaultValue={values.pedigreeUrl} placeholder="https://" />}
                        </Field>
                    </Card>

                    <Card as="section" aria-labelledby="dog-parents">
                        <h2 id="dog-parents" className="mb-4.5 font-display text-xl font-bold">
                            {t("dogs.form.sections.parents")}
                        </h2>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
                            <Field id="dog-sire" label={t("dogs.form.fields.sireName")} error={error("sireName")}>
                                {(control) => <TextInput {...control} name="sireName" defaultValue={values.sireName} />}
                            </Field>
                            <Field id="dog-dam" label={t("dogs.form.fields.damName")} error={error("damName")}>
                                {(control) => <TextInput {...control} name="damName" defaultValue={values.damName} />}
                            </Field>
                        </div>
                        <p className="mt-1.5 text-xs text-stone-500">{t("dogs.form.help.parents")}</p>
                    </Card>

                    <Card as="section" aria-labelledby="dog-about">
                        <h2 id="dog-about" className="mb-4.5 font-display text-xl font-bold">
                            {mode === "edit" && initialValues.name ? t("dogs.form.sections.aboutNamed", { name: initialValues.name }) : t("dogs.form.sections.about")}
                        </h2>
                        <Field id="dog-bio" label={t("dogs.form.fields.bio")} error={error("bio")}>
                            {(control) => <Textarea {...control} name="bio" rows={6} maxLength={DOG_LIMITS.bio} defaultValue={values.bio} />}
                        </Field>
                    </Card>
                </div>

                <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-6">
                    <Card as="section" aria-label={t("dogs.form.photos.heading")}>
                        <PhotoManager initialPhotos={values.photos} max={DOG_LIMITS.photos} error={error("photos")} />
                    </Card>
                    <Card as="section" aria-label={t("dogs.form.documents.heading")}>
                        <HealthDocuments
                            initialDocuments={values.healthDocuments}
                            max={DOG_LIMITS.healthDocuments}
                            labelMax={DOG_LIMITS.documentLabel}
                            error={error("healthDocuments")}
                        />
                    </Card>
                    {dangerZone}
                </div>
            </div>

            {returnToLitter && <input type="hidden" name="returnTo" value="litter" />}
            <SaveBar
                cancelHref="/dashboard/dogs"
                submitLabel={mode === "create" ? t("dogs.form.submitCreate") : t("dogs.form.submitEdit")}
                pending={pending}
                saved={state.status === "saved"}
                resetKey={state.savedAt}
            />
        </form>
    );
}
