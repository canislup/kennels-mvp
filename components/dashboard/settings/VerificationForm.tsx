"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileImage, Plus, X } from "lucide-react";
import type { VerificationFormState } from "@/app/[locale]/dashboard/settings/verification/actions";
import { VERIFICATION_LIMITS } from "@/lib/dashboard/validation/verification";
import Button from "@/components/dashboard/ui/Button";
import Field from "@/components/dashboard/ui/Field";
import ImageUploader from "@/components/dashboard/ui/ImageUploader";
import Notice from "@/components/dashboard/ui/Notice";
import TextInput from "@/components/dashboard/ui/TextInput";
import { useFocusFirstError } from "@/components/dashboard/ui/useFocusFirstError";
import { documentName } from "./documentName";

type SubmitAction = (state: VerificationFormState, formData: FormData) => Promise<VerificationFormState>;
type Doc = { url: string; name: string };

const FORMATS = ["jpg", "jpeg", "png", "webp"];

/**
 * CBKC number + proof documents, submitted (or resubmitted) for review. The
 * document list keeps local state and submits one hidden `documentUrl` input
 * per document. Submitting is disabled while the kennel has no CNPJ/CPF.
 */
export default function VerificationForm({
    action,
    initialValues,
    canSubmit,
    resubmit,
}: {
    action: SubmitAction;
    initialValues: { cbkcRegistration: string; documentUrls: string[] };
    canSubmit: boolean;
    resubmit: boolean;
}) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState(action, { status: "idle", fieldErrors: {}, submission: 0, values: initialValues });
    const values = state.values ?? initialValues;
    const [docs, setDocs] = useState<Doc[]>(() => values.documentUrls.map((url) => ({ url, name: documentName(url) })));
    const [seen, setSeen] = useState(state.submission);
    if (seen !== state.submission) {
        // After a failed submit, show what was submitted (keeping the names we know).
        setSeen(state.submission);
        setDocs(values.documentUrls.map((url) => docs.find((d) => d.url === url) ?? { url, name: documentName(url) }));
    }
    const formRef = useRef<HTMLFormElement>(null);
    const addRef = useRef<HTMLButtonElement>(null);
    useFocusFirstError(formRef, state);

    const message = (key: string, params?: Record<string, string | number>) => t(`common.errors.${key}`, params);
    const cbkcError = state.fieldErrors.cbkcRegistration;
    const docsError = state.fieldErrors.documents;
    const remaining = VERIFICATION_LIMITS.maxDocuments - docs.length;

    return (
        <form ref={formRef} action={formAction} noValidate className="mt-5">
            {state.formError && (
                <div tabIndex={-1} data-error-focus className="mb-4 focus:outline-none">
                    <Notice tone="error" dismissible={false}>
                        {message(state.formError.key, state.formError.params)}
                    </Notice>
                </div>
            )}
            <Field
                id="verification-cbkc"
                label={t("settings.verification.cbkc")}
                help={t("settings.verification.cbkcHelp")}
                error={cbkcError ? message(cbkcError.key, cbkcError.params) : undefined}
                className="max-w-sm"
            >
                {(control) => <TextInput key={state.submission} {...control} name="cbkcRegistration" defaultValue={values.cbkcRegistration} autoComplete="off" />}
            </Field>

            <fieldset className="mt-4.5 min-w-0" aria-describedby={`verification-docs-help${docsError ? " verification-docs-error" : ""}`}>
                <legend className="mb-1.5 block text-[13px] font-semibold text-stone-700">{t("settings.verification.documents")}</legend>
                <p id="verification-docs-help" className="mb-2.5 text-xs text-stone-500">
                    {t("settings.verification.documentsHelp", { max: VERIFICATION_LIMITS.maxDocuments })}
                </p>
                {docs.length > 0 && (
                    <ul className="mb-2 flex flex-col gap-2">
                        {docs.map((doc) => (
                            <li key={doc.url} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm">
                                <FileImage className="size-4 shrink-0 text-stone-500" aria-hidden />
                                <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                                <span className="text-xs text-stone-500">{t("settings.verification.uploaded")}</span>
                                <input type="hidden" name="documentUrl" value={doc.url} />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDocs((current) => current.filter((d) => d.url !== doc.url));
                                        addRef.current?.focus();
                                    }}
                                    aria-label={t("settings.verification.remove", { name: doc.name })}
                                    className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-accent"
                                >
                                    <X className="size-4" aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {docsError && (
                    <p id="verification-docs-error" className="mb-2 text-xs font-medium text-status-red">
                        {message(docsError.key, docsError.params)}
                    </p>
                )}
                {remaining > 0 && (
                    <ImageUploader
                        maxFiles={remaining}
                        formats={FORMATS}
                        onUpload={(image) => setDocs((current) => (current.length >= VERIFICATION_LIMITS.maxDocuments ? current : [...current, { url: image.url, name: image.fileName }]))}
                    >
                        {(open) => (
                            <button
                                ref={addRef}
                                type="button"
                                onClick={open}
                                data-error-focus={docsError ? "" : undefined}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-stone-400 bg-white px-3.5 py-2.25 text-[13px] font-semibold text-stone-900 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                                <Plus className="size-4" aria-hidden />
                                {t("settings.verification.addDocument")}
                            </button>
                        )}
                    </ImageUploader>
                )}
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                {!canSubmit && <p className="text-[13px] text-stone-500">{t("settings.verification.submitBlocked")}</p>}
                <Button type="submit" disabled={!canSubmit || pending} aria-busy={pending}>
                    {pending ? t("settings.verification.submitting") : resubmit ? t("settings.verification.resubmit") : t("settings.verification.submit")}
                </Button>
            </div>
        </form>
    );
}
