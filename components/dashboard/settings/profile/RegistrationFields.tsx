"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { RegistrationType, VerificationStatus } from "@/lib/dashboard/types";
import { formatRegistration } from "@/lib/dashboard/validation/kennelProfile";
import Field from "@/components/dashboard/ui/Field";
import Notice from "@/components/dashboard/ui/Notice";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import TextInput from "@/components/dashboard/ui/TextInput";
import { notifyFormChange } from "@/components/dashboard/ui/SaveBar";

const EMPTY_PATTERN: Record<RegistrationType, string> = { CNPJ: "00.000.000/0000-00", CPF: "000.000.000-00" };

/**
 * Registered as CNPJ / CPF, the number, CBKC and breeding since. The number on
 * file is never sent to the browser: the field starts empty with the masked
 * number as its placeholder, and an empty field keeps what's on file.
 * Switching type clears what was typed.
 */
export default function RegistrationFields({
    defaultType,
    typedNumber,
    cbkcRegistration,
    breedingSince,
    savedType,
    maskedNumber,
    verificationStatus,
    error,
}: {
    defaultType: RegistrationType;
    /** What the user typed before a failed save ("" = keep the number on file). */
    typedNumber: string;
    cbkcRegistration: string;
    breedingSince: string;
    savedType: RegistrationType | null;
    maskedNumber: string | null;
    verificationStatus: VerificationStatus;
    error: (field: string) => string | undefined;
}) {
    const t = useTranslations("dashboard.settings.profile.registration");
    const [type, setType] = useState<RegistrationType>(defaultType);
    const [hasNumber, setHasNumber] = useState(typedNumber !== "");
    const numberRef = useRef<HTMLInputElement>(null);

    const onFile = savedType !== null && type === savedType && maskedNumber !== null;
    const reviewAffected = (verificationStatus === "APPROVED" || verificationStatus === "PENDING") && (hasNumber || (savedType !== null && type !== savedType));
    const help = onFile ? t("help.onFile", { masked: maskedNumber! }) : savedType && type !== savedType ? t(`help.replace.${type}`, { saved: savedType }) : t("help.new");

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
            <Field as="fieldset" id="profile-registration-type" label={t("registeredAs")} error={error("registrationType")} className="col-span-full">
                {(control) => (
                    <div className="max-w-md">
                        <SegmentedControl
                            name="registrationType"
                            control={control}
                            value={type}
                            onValueChange={(next) => {
                                setType(next as RegistrationType);
                                // A number typed for the other type makes no sense: clear it.
                                if (numberRef.current) numberRef.current.value = "";
                                setHasNumber(false);
                                notifyFormChange(numberRef.current);
                            }}
                            options={[
                                { value: "CNPJ", label: t("types.CNPJ") },
                                { value: "CPF", label: t("types.CPF") },
                            ]}
                        />
                    </div>
                )}
            </Field>
            <Field id="profile-registration-number" label={type} help={help} error={error("registrationNumber")}>
                {(control) => (
                    <TextInput
                        {...control}
                        ref={numberRef}
                        name="registrationNumber"
                        defaultValue={typedNumber}
                        placeholder={onFile ? maskedNumber! : EMPTY_PATTERN[type]}
                        inputMode="numeric"
                        autoComplete="off"
                        onChange={(event) => {
                            // Input mask: a convenience only (the server strips it and checks the digits).
                            event.target.value = formatRegistration(type, event.target.value);
                            setHasNumber(event.target.value !== "");
                        }}
                    />
                )}
            </Field>
            <Field id="profile-cbkc" label={t("cbkc")} error={error("cbkcRegistration")}>
                {(control) => <TextInput {...control} name="cbkcRegistration" defaultValue={cbkcRegistration} autoComplete="off" />}
            </Field>
            <Field id="profile-breeding-since" label={t("breedingSince")} error={error("breedingSince")}>
                {(control) => <TextInput {...control} name="breedingSince" defaultValue={breedingSince} inputMode="numeric" placeholder={t("breedingSincePlaceholder")} autoComplete="off" />}
            </Field>
            {reviewAffected && (
                <div className="col-span-full">
                    <Notice tone="warning" dismissible={false}>
                        {t("reviewNotice")}
                    </Notice>
                </div>
            )}
        </div>
    );
}
