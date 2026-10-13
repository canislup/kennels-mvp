// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Kennel verification: one current request per kennel, plus how the kennel is
// registered (CNPJ or CPF), always masked here so the full number never
// reaches the browser. Mutations are called from
// app/[locale]/dashboard/settings/verification/actions.ts.
import { verificationFixture } from "./mock/settings";
import { getMockStore, snapshot } from "./mock/store";
import type { RegistrationSummary, SimpleMutationResult, VerificationStatus, VerificationView } from "./types";

/** "12.345.678/0001-90". A CNPJ is a public company number, so it's shown in full. */
function formatCnpj(digits: string): string {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/** "***.456.789-**": only the middle six digits; a CPF is personal data. */
function maskCpf(digits: string): string {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

function registrationSummary(): RegistrationSummary | null {
    const { cnpj, cpf } = getMockStore().registration;
    if (cnpj) return { type: "CNPJ", maskedNumber: formatCnpj(cnpj) };
    if (cpf) return { type: "CPF", maskedNumber: maskCpf(cpf) };
    return null;
}

// --- DEV-ONLY TESTING AID: delete when the real function is written. ---------------
// In development builds only, the Verification page passes `?state=` and
// `?registration=` through, and this puts the mock store in that state so every
// screen (and its actions) can be tried. Ignored in production builds.
export type VerificationDevPreview = { state?: string; registration?: string };

const DEV_STATES: Record<string, VerificationStatus> = { none: "NOT_SUBMITTED", pending: "PENDING", rejected: "REJECTED", approved: "APPROVED" };
const DEV_REGISTRATIONS: Record<string, { cnpj: string | null; cpf: string | null }> = {
    cnpj: { cnpj: "12345678000190", cpf: null },
    cpf: { cnpj: null, cpf: "12345678901" },
    none: { cnpj: null, cpf: null },
};

function applyDevPreview(preview: VerificationDevPreview | undefined) {
    if (process.env.NODE_ENV === "production" || !preview) return;
    const store = getMockStore();
    const status = preview.state ? DEV_STATES[preview.state] : undefined;
    if (status && store.verification.status !== status) store.verification = verificationFixture(status);
    const registration = preview.registration ? DEV_REGISTRATIONS[preview.registration] : undefined;
    if (registration) Object.assign(store.registration, registration);
}
// --- end of dev-only testing aid ----------------------------------------------------

export async function getVerification(kennelId: string, devPreview?: VerificationDevPreview): Promise<VerificationView> {
    void kennelId;
    applyDevPreview(devPreview);
    const store = getMockStore();
    const registration = registrationSummary();
    return snapshot({ request: store.verification, registration, registrationMissing: registration === null, cbkcOnFile: store.registration.cbkcRegistration });
}

/** For the Overview checklist: requested = PENDING or APPROVED. */
export async function getVerificationStatus(kennelId: string): Promise<VerificationStatus> {
    void kennelId;
    return getMockStore().verification.status;
}

/** From NOT_SUBMITTED or REJECTED, with a CNPJ or CPF on file. Input already validated (1–5 documents). */
export async function submitVerification(kennelId: string, input: { cbkcRegistration: string | null; documentUrls: string[] }): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const { status } = store.verification;
    if (status !== "NOT_SUBMITTED" && status !== "REJECTED") return { ok: false, fieldErrors: {}, formError: { key: "verificationNotEditable" } };
    if (!registrationSummary()) return { ok: false, fieldErrors: {}, formError: { key: "registrationMissing" } };
    store.verification = {
        ...store.verification,
        status: "PENDING",
        cbkcRegistration: input.cbkcRegistration,
        documentUrls: input.documentUrls,
        submittedAt: new Date().toISOString(),
        decidedAt: null,
        reviewerNote: null,
    };
    return { ok: true };
}

/** PENDING back to NOT_SUBMITTED (keeps the CBKC number and documents for a later submit). */
export async function withdrawVerification(kennelId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    if (store.verification.status !== "PENDING") return { ok: false, fieldErrors: {}, formError: { key: "verificationNotPending" } };
    store.verification = { ...store.verification, status: "NOT_SUBMITTED", submittedAt: null };
    return { ok: true };
}
