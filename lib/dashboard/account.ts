// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Partly real: the starting point is the real Owner row, and the duplicate
// email rule checks real owners. Saved changes live in the mock store, and
// getCurrentKennel() applies them so the sidebar name updates. Nothing is
// written to the database and nothing is ever deleted.)
//
// The Account tab: details, password, account deletion. `ownerId` is the
// session user (CurrentKennel.ownerId), never a value from the browser.
import { prisma } from "@/lib/db";
import { getMockStore } from "./mock/store";
import { savedShellOverrides } from "./kennelProfile";
import { validateDeletionConfirm, validatePasswordChange } from "./validation/account";
import type { Account, PasswordChangeInput, SimpleMutationResult } from "./types";

/** Name and email from the Owner row (with saved mock changes on top), and the saved language (null = never chosen). */
export async function getAccount(ownerId: string): Promise<(Omit<Account, "locale"> & { locale: Account["locale"] | null }) | null> {
    const owner = await prisma.owner.findUnique({ where: { id: ownerId }, select: { fullName: true, email: true } });
    if (!owner) return null;
    const saved = getMockStore().accountOverrides[ownerId] ?? {};
    return { fullName: saved.fullName ?? owner.fullName, email: saved.email ?? owner.email, locale: saved.locale ?? null };
}

/** Input already validated. Refuses an email that belongs to another owner. */
export async function updateAccount(ownerId: string, input: Account): Promise<SimpleMutationResult> {
    const taken = await prisma.owner.findFirst({ where: { email: { equals: input.email, mode: "insensitive" }, NOT: { id: ownerId } }, select: { id: true } });
    if (taken) return { ok: false, fieldErrors: { email: { key: "emailTaken" } } };
    getMockStore().accountOverrides[ownerId] = { ...input };
    return { ok: true };
}

/**
 * The mock can't check the real current password, so it only requires one
 * (see ENDPOINTS.md for what the real version needs). Never stores or
 * returns password values.
 */
export async function changePassword(ownerId: string, input: PasswordChangeInput): Promise<SimpleMutationResult> {
    void ownerId;
    const fieldErrors = validatePasswordChange(input);
    if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
    return { ok: true };
}

/**
 * Checks the typed kennel name (exact, case-sensitive) and then does NOT
 * delete anything: the mock never deletes. The UI says so. The real deletion
 * order is in ENDPOINTS.md.
 */
export async function requestAccountDeletion(ownerId: string, kennelId: string, input: { confirmName: string }): Promise<SimpleMutationResult> {
    const kennel = await prisma.kennel.findFirst({ where: { id: kennelId, ownerId }, select: { name: true } });
    if (!kennel) return { ok: false, fieldErrors: {}, formError: { key: "notFound" } };
    // TEMPORARY (mock): the name saved on Settings → Kennel profile is the one on screen.
    const error = validateDeletionConfirm(input.confirmName, savedShellOverrides(kennelId)?.name ?? kennel.name);
    if (error) return { ok: false, fieldErrors: { confirmName: error } };
    return { ok: true };
}
