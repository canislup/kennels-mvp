"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { HealthDocument } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import ImageUploader from "@/components/dashboard/ui/ImageUploader";
import TextInput from "@/components/dashboard/ui/TextInput";
import { notifyFormChange } from "@/components/dashboard/ui/SaveBar";

/**
 * Health documents (images of test results). "Upload health document" asks
 * for a label first, then opens the image uploader. Each document submits as
 * a hidden `healthDocument` input holding JSON {id,url,label,fileName}.
 */
export default function HealthDocuments({
    initialDocuments,
    max,
    labelMax,
    error,
}: {
    initialDocuments: HealthDocument[];
    max: number;
    labelMax: number;
    error?: string;
}) {
    const t = useTranslations("dashboard.dogs.form.documents");
    const [documents, setDocuments] = useState(initialDocuments);
    const [adding, setAdding] = useState(false);
    const [label, setLabel] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLInputElement>(null);
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        notifyFormChange(rootRef.current);
    }, [documents]);

    useEffect(() => {
        if (adding) labelRef.current?.focus();
    }, [adding]);

    const trimmed = label.trim();

    return (
        <div ref={rootRef}>
            <div className="mb-1.5 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">{t("heading")}</h2>
                <span className="text-xs text-stone-500">{t("count", { count: documents.length })}</span>
            </div>
            <p className="mb-3.5 text-[13px] text-stone-600">{t("description")}</p>
            {error && (
                <p tabIndex={-1} data-error-focus className="mb-3 text-xs font-medium text-status-red focus:outline-none">
                    {error}
                </p>
            )}

            {documents.length > 0 && (
                <ul className="flex flex-col gap-3">
                    {documents.map((doc) => (
                        <li key={doc.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                            <img src={doc.url} alt="" className="h-17.5 w-14 shrink-0 rounded-lg border border-line bg-stone-50 object-cover" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-stone-900">{doc.label}</p>
                                <p className="mt-0.5 truncate text-xs text-stone-500">{doc.fileName}</p>
                            </div>
                            <input type="hidden" name="healthDocument" value={JSON.stringify(doc)} />
                            <Button variant="ghost" className="px-3 py-2 text-[13px] font-medium text-stone-500" onClick={() => setDocuments((current) => current.filter((d) => d.id !== doc.id))}>
                                {t("remove")}
                                <span className="sr-only"> {doc.label}</span>
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            {documents.length >= max ? (
                <p className="mt-3.5 text-xs text-stone-500">{t("limitReached", { max })}</p>
            ) : adding ? (
                <div className="mt-3.5 rounded-xl border border-line p-3.5">
                    <label htmlFor="new-document-label" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                        {t("labelField")}
                    </label>
                    {/* No `name`: the label is only stored once an image is uploaded. */}
                    <TextInput
                        ref={labelRef}
                        id="new-document-label"
                        value={label}
                        maxLength={labelMax}
                        placeholder={t("labelPlaceholder")}
                        onChange={(event) => setLabel(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                        <ImageUploader
                            onUpload={(image) => {
                                setDocuments((current) => [...current, { id: `doc_${crypto.randomUUID()}`, url: image.url, label: trimmed, fileName: image.fileName }]);
                                setLabel("");
                                setAdding(false);
                            }}
                        >
                            {(open) => (
                                <Button onClick={open} disabled={!trimmed}>
                                    {t("chooseImage")}
                                </Button>
                            )}
                        </ImageUploader>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setAdding(false);
                                setLabel("");
                            }}
                        >
                            {t("cancel")}
                        </Button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="mt-3.5 w-full rounded-xl border border-dashed border-stone-400 bg-white px-3 py-3 text-sm font-semibold text-accent transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    {t("upload")}
                </button>
            )}
        </div>
    );
}
