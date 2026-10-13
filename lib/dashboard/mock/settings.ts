// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only.)
//
// Settings: account overrides (the real Owner row is the starting point),
// notification preferences, the kennel's registration numbers and its
// verification request. Keyed by owner id where the real model is per owner.
import type { Account, NotificationPreferenceType, VerificationRequest, VerificationStatus } from "../types";

const DAY = 24 * 60 * 60_000;

/** Defaults for owners who never saved preferences: all on except waitlist activity. */
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationPreferenceType, boolean> = {
    NEW_LEAD: true,
    NEW_MESSAGE: true,
    NEW_REVIEW: true,
    WAITLIST_ACTIVITY: false,
    VERIFICATION_UPDATE: true,
};

/**
 * Registration numbers on file. `cnpj` and `cbkcRegistration` exist on Kennel;
 * `cpf` is a NEW FIELD. Digits only. The demo kennel is a company (design).
 */
export type MockRegistration = { cnpj: string | null; cpf: string | null; cbkcRegistration: string | null };

const DOCS = ["cnpj-cartao.jpg", "cbkc-certificado.jpg"].map((name) => `https://res.cloudinary.com/kennelos-demo/image/upload/v1/verification/${name}`);

/** One request per status, for the dev-only `?state=` preview (see verification.ts). */
export function verificationFixture(status: VerificationStatus): VerificationRequest {
    const iso = (ago: number) => new Date(Date.now() - ago).toISOString();
    switch (status) {
        case "NOT_SUBMITTED":
            return { id: "verif_1", status, cbkcRegistration: null, documentUrls: [], submittedAt: null, decidedAt: null, reviewerNote: null };
        case "PENDING":
            return { id: "verif_1", status, cbkcRegistration: "CBKC-48213", documentUrls: DOCS, submittedAt: iso(2 * DAY), decidedAt: null, reviewerNote: null };
        case "REJECTED":
            return {
                id: "verif_1",
                status,
                cbkcRegistration: "CBKC-48213",
                documentUrls: DOCS.slice(0, 1),
                submittedAt: iso(9 * DAY),
                decidedAt: iso(6 * DAY),
                reviewerNote: "The CNPJ card photo is cut off at the bottom, so we can't read the registration date. Please upload a photo that shows the whole card.",
            };
        case "APPROVED":
            return { id: "verif_1", status, cbkcRegistration: "CBKC-48213", documentUrls: DOCS, submittedAt: iso(21 * DAY), decidedAt: iso(18 * DAY), reviewerNote: null };
    }
}

export function buildSettingsFixtures() {
    return {
        /** Saved changes to the real Owner row (fullName/email) plus NEW FIELD locale, by owner id. */
        accountOverrides: {} as Record<string, Partial<Account>>,
        /** Saved preferences by owner id; missing = defaults. */
        notificationPreferences: {} as Record<string, Record<NotificationPreferenceType, boolean>>,
        registration: { cnpj: "12345678000190", cpf: null, cbkcRegistration: "CBKC-48213" } as MockRegistration,
        verification: verificationFixture("NOT_SUBMITTED"),
    };
}
