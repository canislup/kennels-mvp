"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { KennelProfileFormState } from "@/app/[locale]/dashboard/settings/actions";
import type { ContactChannel, FieldError, KennelBreedOption, ProfileBreed, RegistrationType, VerificationStatus } from "@/lib/dashboard/types";
import { getKennelPublicPreview, type KennelPublicPreview } from "@/lib/dashboard/kennelPreview";
import { BR_STATES, CONTACT_CHANNELS, KENNEL_PROFILE_LIMITS, TIME_ZONES, type KennelProfileFormValues } from "@/lib/dashboard/validation/kennelProfile";
import Card from "@/components/dashboard/ui/Card";
import Field from "@/components/dashboard/ui/Field";
import Notice from "@/components/dashboard/ui/Notice";
import SaveBar from "@/components/dashboard/ui/SaveBar";
import Select from "@/components/dashboard/ui/Select";
import TextInput from "@/components/dashboard/ui/TextInput";
import Textarea from "@/components/dashboard/ui/Textarea";
import Toggle from "@/components/dashboard/ui/Toggle";
import { useFocusFirstError } from "@/components/dashboard/ui/useFocusFirstError";
import BreedPicker from "./BreedPicker";
import LivePreview from "./LivePreview";
import LocationFields from "./LocationFields";
import ProfileImages from "./ProfileImages";
import RegistrationFields from "./RegistrationFields";
import SlugField from "./SlugField";

type SaveAction = (state: KennelProfileFormState, formData: FormData) => Promise<KennelProfileFormState>;

const CONTACT_INPUT: Record<ContactChannel, { type: string; inputMode?: "tel" | "email" | "url"; autoComplete: string }> = {
    phone: { type: "tel", inputMode: "tel", autoComplete: "tel" },
    email: { type: "email", inputMode: "email", autoComplete: "email" },
    website: { type: "url", inputMode: "url", autoComplete: "url" },
    instagram: { type: "text", autoComplete: "off" },
    whatsapp: { type: "tel", inputMode: "tel", autoComplete: "tel" },
};

/**
 * Settings → Kennel profile: ONE form, ONE Server Action, ONE sticky SaveBar.
 * Inputs are uncontrolled; after every submit (and on Discard) the fields
 * remount with the right defaults (`view.key`). The live preview reads the
 * form's FormData on every input, so it shows unsaved edits. The right column
 * also holds the server-rendered Profile strength card (`strength`).
 */
export default function KennelProfileForm({
    action,
    savedValues,
    savedSlug,
    savedBreeds,
    breedOptions,
    savedRegistrationType,
    maskedNumber,
    verificationStatus,
    publicPagePath,
    strength,
}: {
    action: SaveAction;
    /** The saved profile as form values (fresh after each save, via refresh()). */
    savedValues: KennelProfileFormValues;
    savedSlug: string;
    savedBreeds: ProfileBreed[];
    breedOptions: KennelBreedOption[];
    savedRegistrationType: RegistrationType | null;
    maskedNumber: string | null;
    verificationStatus: VerificationStatus;
    publicPagePath: string | null;
    strength: ReactNode;
}) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState(action, { status: "idle", values: savedValues, fieldErrors: {}, submission: 0 });
    const formRef = useRef<HTMLFormElement>(null);
    useFocusFirstError(formRef, state);

    // Which values the fields mount with: the submitted ones after an error (nothing
    // typed is lost), the fresh saved ones after a save or on Discard.
    const [view, setView] = useState({ key: 0, values: savedValues });
    const [baselineKey, setBaselineKey] = useState(0);
    const [seenSubmission, setSeenSubmission] = useState(state.submission);
    if (seenSubmission !== state.submission) {
        setSeenSubmission(state.submission);
        setView({ key: view.key + 1, values: state.status === "saved" ? savedValues : state.values });
        if (state.status === "saved") setBaselineKey(baselineKey + 1);
    }
    const values = view.values;
    // Errors belong to the last submit; Discard hides them.
    const [discardedAt, setDiscardedAt] = useState(-1);
    const fieldErrors = discardedAt === state.submission ? {} : state.fieldErrors;

    function discard() {
        setView({ key: view.key + 1, values: savedValues });
        setBaselineKey(baselineKey + 1);
        setDiscardedAt(state.submission);
    }

    const message = (fieldError: FieldError | undefined) => (fieldError ? t(`common.errors.${fieldError.key}`, fieldError.params) : undefined);
    const error = (field: string) => message(fieldErrors[field]);

    // Live preview from the form's current FormData (unsaved values included).
    const breedNames = useMemo(() => new Map(breedOptions.map((option) => [option.id, option.name])), [breedOptions]);
    const [preview, setPreview] = useState<KennelPublicPreview>(() =>
        getKennelPublicPreview({ ...values, breedNames: values.breedIds.map((id) => breedNames.get(id) ?? "") }),
    );
    useEffect(() => {
        const form = formRef.current;
        if (!form) return;
        let frame = 0;
        const read = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const data = new FormData(form);
                const text = (key: string) => String(data.get(key) ?? "");
                setPreview(
                    getKennelPublicPreview({
                        name: text("name"),
                        city: text("city"),
                        state: text("state"),
                        description: text("description"),
                        logoUrl: text("logoUrl"),
                        coverUrl: text("coverUrl"),
                        breedNames: data.getAll("breedIds").map((id) => breedNames.get(String(id)) ?? ""),
                    }),
                );
            });
        };
        read(); // the fields were just (re)mounted
        form.addEventListener("input", read);
        form.addEventListener("change", read);
        return () => {
            cancelAnimationFrame(frame);
            form.removeEventListener("input", read);
            form.removeEventListener("change", read);
        };
    }, [view.key, breedNames]);

    const section = "font-display text-xl font-bold";
    const sub = "mt-1 mb-5 text-[13px] text-stone-500";

    return (
        <form ref={formRef} action={formAction} noValidate>
            {state.formError && discardedAt !== state.submission && (
                <div tabIndex={-1} data-error-focus className="mb-5 focus:outline-none">
                    <Notice tone="error" dismissible={false}>
                        {message(state.formError)}
                    </Notice>
                </div>
            )}

            <div key={view.key} className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="flex min-w-0 flex-col gap-6 lg:flex-[3_1_0%]">
                    <Card as="section" id="profile-identity" aria-labelledby="profile-identity-heading" className="scroll-mt-24">
                        <h2 id="profile-identity-heading" className={section}>
                            {t("settings.profile.identity.heading")}
                        </h2>
                        <p className={sub}>{t("settings.profile.identity.sub")}</p>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
                            <Field id="profile-name" label={t("settings.profile.identity.name")} error={error("name")} className="col-span-full">
                                {(control) => <TextInput {...control} name="name" defaultValue={values.name} autoComplete="organization" required />}
                            </Field>
                            <Field id="profile-slug" label={t("settings.profile.identity.slug")} error={error("slug")} className="col-span-full">
                                {(control) => <SlugField control={control} name="slug" defaultValue={values.slug} savedSlug={savedSlug} />}
                            </Field>
                            <Field id="profile-city" label={t("settings.profile.identity.city")} error={error("city")}>
                                {(control) => <TextInput {...control} name="city" defaultValue={values.city} autoComplete="address-level2" required />}
                            </Field>
                            <Field id="profile-state" label={t("settings.profile.identity.state")} error={error("state")}>
                                {(control) => (
                                    <Select {...control} name="state" defaultValue={values.state}>
                                        {!BR_STATES.includes(values.state) && <option value={values.state}>{values.state || t("settings.profile.identity.statePlaceholder")}</option>}
                                        {BR_STATES.map((uf) => (
                                            <option key={uf} value={uf}>
                                                {uf}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </Field>
                            <Field id="profile-description" label={t("settings.profile.identity.description")} error={error("description")} className="col-span-full scroll-mt-24">
                                {(control) => <Textarea {...control} name="description" rows={5} maxLength={KENNEL_PROFILE_LIMITS.description} defaultValue={values.description} />}
                            </Field>
                        </div>
                        <ProfileImages
                            logo={{ url: values.logoUrl, publicId: values.logoPublicId }}
                            cover={{ url: values.coverUrl, publicId: values.coverPublicId }}
                            logoError={error("logoUrl")}
                            coverError={error("coverUrl")}
                        />
                    </Card>

                    <Card as="section" id="profile-breeds" aria-labelledby="profile-breeds-heading" className="scroll-mt-24">
                        <h2 id="profile-breeds-heading" className={section}>
                            {t("settings.profile.breeds.heading")}
                        </h2>
                        <p className={sub}>{t("settings.profile.breeds.sub", { max: KENNEL_PROFILE_LIMITS.breedsMax })}</p>
                        <BreedPicker initialIds={values.breedIds} savedBreeds={savedBreeds} options={breedOptions} max={KENNEL_PROFILE_LIMITS.breedsMax} error={error("breedIds")} />
                    </Card>

                    <Card as="section" id="registration" aria-labelledby="profile-registration-heading" className="scroll-mt-24">
                        <h2 id="profile-registration-heading" className={section}>
                            {t("settings.profile.registration.heading")}
                        </h2>
                        <p className={sub}>{t("settings.profile.registration.sub")}</p>
                        <RegistrationFields
                            defaultType={(values.registrationType === "CPF" ? "CPF" : "CNPJ") as RegistrationType}
                            typedNumber={values.registrationNumber}
                            cbkcRegistration={values.cbkcRegistration}
                            breedingSince={values.breedingSince}
                            savedType={savedRegistrationType}
                            maskedNumber={maskedNumber}
                            verificationStatus={verificationStatus}
                            error={error}
                        />
                    </Card>

                    <Card as="section" id="profile-contact" aria-labelledby="profile-contact-heading" className="scroll-mt-24">
                        <h2 id="profile-contact-heading" className={section}>
                            {t("settings.profile.contact.heading")}
                        </h2>
                        <p className={sub}>{t("settings.profile.contact.sub")}</p>
                        <div className="flex flex-col gap-4">
                            {CONTACT_CHANNELS.map((channel) => (
                                <div key={channel} className="flex flex-wrap items-start gap-x-3.5 gap-y-2">
                                    <Field id={`profile-${channel}`} label={t(`settings.profile.contact.channels.${channel}`)} error={error(channel)} className="min-w-0 flex-[1_1_260px]">
                                        {(control) => (
                                            <TextInput
                                                {...control}
                                                name={channel}
                                                defaultValue={values.contact[channel].value}
                                                placeholder={t(`settings.profile.contact.placeholders.${channel}`)}
                                                {...CONTACT_INPUT[channel]}
                                            />
                                        )}
                                    </Field>
                                    <Toggle
                                        name={`${channel}Public`}
                                        defaultChecked={values.contact[channel].isPublic}
                                        label={<span className="sr-only">{t("settings.profile.contact.showLabel", { channel: t(`settings.profile.contact.channels.${channel}`) })}</span>}
                                        stateLabels={{ on: t("settings.profile.contact.shown"), off: t("settings.profile.contact.hidden") }}
                                        className="min-w-44 sm:mt-8.5"
                                    />
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card as="section" id="profile-location" aria-labelledby="profile-location-heading" className="scroll-mt-24">
                        <h2 id="profile-location-heading" className={section}>
                            {t("settings.profile.location.heading")}
                        </h2>
                        <p className={sub}>{t("settings.profile.location.sub")}</p>
                        <LocationFields address={values.address} latitude={values.latitude} longitude={values.longitude} error={error} />
                    </Card>

                    <Card as="section" id="profile-timezone" aria-labelledby="profile-timezone-heading" className="scroll-mt-24">
                        <h2 id="profile-timezone-heading" className={section}>
                            {t("settings.profile.timeZone.heading")}
                        </h2>
                        <Field id="profile-timezone-select" label={t("settings.profile.timeZone.label")} help={t("settings.profile.timeZone.help")} error={error("timeZone")} className="mt-4 max-w-md">
                            {(control) => (
                                <Select {...control} name="timeZone" defaultValue={values.timeZone}>
                                    {TIME_ZONES.map((zone) => (
                                        <option key={zone.value} value={zone.value}>
                                            {t(`settings.profile.timeZone.zones.${zone.key}`)}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </Field>
                    </Card>
                </div>

                <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:flex-[2_1_0%]">
                    <LivePreview preview={preview} publicPagePath={publicPagePath} />
                    {strength}
                </div>
            </div>

            <SaveBar onDiscard={discard} submitLabel={t("settings.profile.save")} pending={pending} saved={state.status === "saved"} resetKey={baselineKey} />
        </form>
    );
}
