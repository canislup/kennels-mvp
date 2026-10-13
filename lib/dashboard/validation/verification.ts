// REAL LOGIC: keep when the backend lands. Server-side rules for a
// verification request. Errors are translation keys (dashboard.common.errors.*).
import type { FieldError } from "../types";
import { textField } from "./common";

export const VERIFICATION_LIMITS = { cbkc: 40, minDocuments: 1, maxDocuments: 5 } as const;

const CLOUDINARY_URL = /^https:\/\/res\.cloudinary\.com\//;

export function validateVerificationInput(
    formData: FormData,
): { ok: true; input: { cbkcRegistration: string | null; documentUrls: string[] } } | { ok: false; values: { cbkcRegistration: string; documentUrls: string[] }; fieldErrors: Record<string, FieldError> } {
    const cbkcRegistration = textField(formData, "cbkcRegistration");
    // One hidden input per document (whitelisted key), deduplicated.
    const documentUrls = [...new Set(formData.getAll("documentUrl").filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean))];
    const fieldErrors: Record<string, FieldError> = {};
    if (cbkcRegistration.length > VERIFICATION_LIMITS.cbkc) fieldErrors.cbkcRegistration = { key: "tooLong", params: { max: VERIFICATION_LIMITS.cbkc } };
    if (documentUrls.length < VERIFICATION_LIMITS.minDocuments) fieldErrors.documents = { key: "documentsRequired" };
    else if (documentUrls.length > VERIFICATION_LIMITS.maxDocuments) fieldErrors.documents = { key: "tooManyDocuments", params: { max: VERIFICATION_LIMITS.maxDocuments } };
    else if (documentUrls.some((url) => !CLOUDINARY_URL.test(url))) fieldErrors.documents = { key: "invalidUpload" };
    if (Object.keys(fieldErrors).length > 0) return { ok: false, values: { cbkcRegistration, documentUrls }, fieldErrors };
    return { ok: true, input: { cbkcRegistration: cbkcRegistration || null, documentUrls } };
}
