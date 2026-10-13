"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LeadFormState } from "@/app/[locale]/dashboard/leads/actions";
import type { FieldError, LeadFormOptions } from "@/lib/dashboard/types";
import { LEAD_LIMITS, type LeadFormValues } from "@/lib/dashboard/validation/lead";
import Card from "@/components/dashboard/ui/Card";
import Field from "@/components/dashboard/ui/Field";
import Notice from "@/components/dashboard/ui/Notice";
import SaveBar from "@/components/dashboard/ui/SaveBar";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import Select from "@/components/dashboard/ui/Select";
import TextInput from "@/components/dashboard/ui/TextInput";
import { leadHref } from "../hrefs";
import { LEAD_SOURCES, LEAD_STAGE_ORDER } from "./leadMeta";

type SaveAction = (state: LeadFormState, formData: FormData) => Promise<LeadFormState>;

/**
 * Add lead. Same pattern as the litter form: native <form> + Server Action via
 * useActionState, uncontrolled fields remounted after each submit. The only
 * local state is the breed: the litter and dog selects list only that breed
 * and remount (key={breed}) when it changes.
 */
export default function LeadForm({
    mode = "create",
    action,
    initialValues,
    options,
    today,
    cancelHref = "/dashboard/leads",
}: {
    /** "edit" hides the stage (changed on the lead page) and saves back to the lead page. */
    mode?: "create" | "edit";
    action: SaveAction;
    initialValues: LeadFormValues;
    options: LeadFormOptions;
    today: string;
    cancelHref?: string;
}) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState(action, { status: "idle", values: initialValues, fieldErrors: {} });
    const values = state.values;
    const formRef = useRef<HTMLFormElement>(null);

    const [breed, setBreed] = useState(values.interestBreed);
    const [seenSubmission, setSeenSubmission] = useState(state.submission);
    if (seenSubmission !== state.submission) {
        setSeenSubmission(state.submission);
        setBreed(state.values.interestBreed);
    }
    const litters = options.litters.filter((litter) => litter.breed === breed);
    const dogs = options.dogs.filter((dog) => dog.breed === breed);
    const keepIfListed = (id: string, list: { id: string }[]) => (list.some((item) => item.id === id) ? id : "");

    const message = (fieldError: FieldError | undefined) => (fieldError ? t(`common.errors.${fieldError.key}`, fieldError.params) : undefined);
    const error = (field: keyof LeadFormValues) => message(state.fieldErrors[field]);

    useEffect(() => {
        if (state.status !== "error") return;
        const target = formRef.current?.querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], [data-error-focus]');
        target?.focus();
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [state]);

    const duplicate = state.formError?.key === "duplicateLead" ? state.formError.params : undefined;

    return (
        <form ref={formRef} action={formAction} noValidate>
            {state.formError && (
                <div tabIndex={-1} data-error-focus className="mb-5 focus:outline-none">
                    <Notice tone="error" dismissible={false}>
                        {message(state.formError)}{" "}
                        {duplicate && (
                            <Link href={leadHref(String(duplicate.leadId))} className="font-semibold underline">
                                {t("leads.form.openExisting", { name: String(duplicate.name) })}
                            </Link>
                        )}
                    </Notice>
                </div>
            )}

            <div key={state.submission ?? 0} className="flex max-w-3xl flex-col gap-6">
                <Card as="section" aria-labelledby="lead-contact">
                    <h2 id="lead-contact" className="mb-4.5 font-display text-xl font-bold">
                        {t("leads.form.sections.contact")}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
                        <Field id="lead-name" label={t("leads.form.fields.name")} error={error("name")} className="col-span-full">
                            {(control) => <TextInput {...control} name="name" defaultValue={values.name} autoComplete="off" />}
                        </Field>
                        <Field id="lead-email" label={t("leads.form.fields.email")} help={t("leads.form.help.emailOrPhone")} error={error("email")}>
                            {(control) => <TextInput {...control} type="email" name="email" defaultValue={values.email} autoComplete="off" />}
                        </Field>
                        <Field id="lead-phone" label={t("leads.form.fields.phone")} error={error("phone")}>
                            {(control) => <TextInput {...control} type="tel" name="phone" defaultValue={values.phone} placeholder={t("leads.form.placeholders.phone")} autoComplete="off" />}
                        </Field>
                        <Field as="fieldset" id="lead-preferred" label={t("leads.form.fields.preferredContact")} error={error("preferredContact")} className="col-span-full">
                            {(control) => (
                                <SegmentedControl
                                    name="preferredContact"
                                    control={control}
                                    defaultValue={values.preferredContact}
                                    options={(["WHATSAPP", "PHONE", "EMAIL"] as const).map((value) => ({ value, label: t(`leads.contact.${value}`) }))}
                                />
                            )}
                        </Field>
                        <Field id="lead-city" label={t("leads.form.fields.city")} error={error("city")}>
                            {(control) => <TextInput {...control} name="city" defaultValue={values.city} maxLength={LEAD_LIMITS.city} />}
                        </Field>
                        <Field id="lead-state" label={t("leads.form.fields.state")} error={error("state")}>
                            {(control) => <TextInput {...control} name="state" defaultValue={values.state} maxLength={LEAD_LIMITS.state} />}
                        </Field>
                    </div>
                </Card>

                <Card as="section" aria-labelledby="lead-pipeline">
                    <h2 id="lead-pipeline" className="mb-4.5 font-display text-xl font-bold">
                        {t("leads.form.sections.pipeline")}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4.5">
                        <Field id="lead-source" label={t("leads.form.fields.source")} error={error("source")}>
                            {(control) => (
                                <Select {...control} name="source" defaultValue={values.source}>
                                    {LEAD_SOURCES.map((source) => (
                                        <option key={source} value={source}>
                                            {t(`leads.sources.${source}`)}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </Field>
                        {mode === "create" && (
                            <Field id="lead-stage" label={t("leads.form.fields.stage")} error={error("stage")}>
                                {(control) => (
                                    <Select {...control} name="stage" defaultValue={values.stage}>
                                        {LEAD_STAGE_ORDER.map((stage) => (
                                            <option key={stage} value={stage}>
                                                {t(`leads.stages.${stage}`)}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </Field>
                        )}
                        <Field id="lead-follow-up" label={t("leads.form.fields.followUpAt")} help={t("leads.form.help.followUpAt")} error={error("followUpAt")}>
                            {(control) => <TextInput {...control} type="date" name="followUpAt" defaultValue={values.followUpAt} min={mode === "edit" && values.followUpAt && values.followUpAt < today ? values.followUpAt : today} />}
                        </Field>
                    </div>
                </Card>

                <Card as="section" aria-labelledby="lead-interest">
                    <h2 id="lead-interest" className="mb-4.5 font-display text-xl font-bold">
                        {t("leads.form.sections.interest")}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4.5">
                        <Field id="lead-breed" label={t("leads.form.fields.interestBreed")} help={t("leads.form.help.breed")} error={error("interestBreed")}>
                            {(control) => (
                                <Select {...control} name="interestBreed" defaultValue={values.interestBreed} onChange={(event) => setBreed(event.target.value)}>
                                    <option value="">{t("leads.form.placeholders.breed")}</option>
                                    {options.breeds.map((b) => (
                                        <option key={b.id} value={b.name}>
                                            {b.name}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </Field>
                        <Field id="lead-litter" label={t("leads.form.fields.litter")} error={error("litterId")}>
                            {(control) => (
                                <Select key={breed} {...control} name="litterId" defaultValue={keepIfListed(values.litterId, litters)} disabled={!breed}>
                                    <option value="">{breed ? t("leads.form.anyLitter") : t("leads.form.chooseBreedFirst")}</option>
                                    {litters.map((litter) => (
                                        <option key={litter.id} value={litter.id}>
                                            {litter.name}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </Field>
                        <Field id="lead-dog" label={t("leads.form.fields.dog")} error={error("dogId")}>
                            {(control) => (
                                <Select key={breed} {...control} name="dogId" defaultValue={keepIfListed(values.dogId, dogs)} disabled={!breed}>
                                    <option value="">{breed ? t("leads.form.noDog") : t("leads.form.chooseBreedFirst")}</option>
                                    {dogs.map((dog) => (
                                        <option key={dog.id} value={dog.id}>
                                            {dog.name}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </Field>
                        <Field id="lead-note" label={t("leads.form.fields.interestNote")} help={t("leads.form.help.interestNote")} error={error("interestNote")} className="col-span-full">
                            {(control) => (
                                <TextInput {...control} name="interestNote" defaultValue={values.interestNote} placeholder={t("leads.form.placeholders.interestNote")} maxLength={LEAD_LIMITS.interestNote} />
                            )}
                        </Field>
                    </div>
                </Card>
            </div>

            <SaveBar cancelHref={cancelHref} submitLabel={mode === "edit" ? t("leads.form.submitEdit") : t("leads.form.submit")} pending={pending} saved={false} />
        </form>
    );
}
