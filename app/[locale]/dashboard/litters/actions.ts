"use server";

// Server Actions for the Litters screen and the litter form. Each one resolves
// the signed-in kennel, parses input into explicit typed values (never
// spreading raw input), validates on the server, then calls lib/dashboard.
// Ownership of the litter and of every dog it references is checked again in
// the data layer (see ENDPOINTS.md); a bound id is not tamper-proof.
import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import {
    createLitter,
    deleteLitter,
    getLitterDetail,
    getLitterFormOptions,
    getLitterForEdit,
    linkPuppyToLitter,
    updateLitter,
    updateLitterStatus,
} from "@/lib/dashboard/litters";
import { LITTER_STATUSES, parseLitterFormData, validateLitterInput, type LitterFieldErrors, type LitterFormValues } from "@/lib/dashboard/validation/litter";
import type { FieldError, LitterStatus, SimpleMutationResult } from "@/lib/dashboard/types";

export type LitterFormState = {
    status: "idle" | "error" | "saved";
    values: LitterFormValues;
    fieldErrors: LitterFieldErrors;
    formError?: FieldError;
    savedAt?: number;
    /** Increments on every submit; the form remounts its fields with it (see DogFormState). */
    submission?: number;
};

async function requireKennelId(): Promise<string> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    return kennel!.id;
}

/** Create (litterId null) or update a litter. */
export async function saveLitterAction(litterId: string | null, previous: LitterFormState, formData: FormData): Promise<LitterFormState> {
    const kennelId = await requireKennelId();
    const values = parseLitterFormData(formData);
    const submission = (previous.submission ?? 0) + 1;

    const existing = litterId ? await getLitterDetail(kennelId, litterId) : null;
    if (litterId && !existing) return { status: "error", values, fieldErrors: {}, formError: { key: "notFound" }, submission };

    const [options, saved] = await Promise.all([getLitterFormOptions(kennelId, litterId ?? undefined), litterId ? getLitterForEdit(kennelId, litterId) : null]);
    const validation = validateLitterInput(values, {
        breedNames: options.breeds.map((b) => b.name),
        females: options.females,
        males: options.males,
        // Linked puppies all have the litter's current breed, so changing the breed is refused while any are linked.
        linkedPuppyBreeds: existing && existing.puppies.length > 0 ? [existing.breed] : undefined,
        current: saved ? { damId: saved.damId, sireId: saved.sireId } : undefined,
    });
    if (!validation.ok) return { status: "error", values, fieldErrors: validation.fieldErrors, submission };

    const result = litterId ? await updateLitter(kennelId, litterId, validation.input) : await createLitter(kennelId, validation.input);
    if (!result.ok) return { status: "error", values, fieldErrors: result.fieldErrors, formError: result.formError, submission };

    if (!litterId) {
        redirect({ href: `/dashboard/litters?litter=${encodeURIComponent(result.litter.id)}&notice=created`, locale: await getLocale() });
    }
    refresh();
    return { status: "saved", values, fieldErrors: {}, savedAt: Date.now(), submission };
}

/** "Change status" menu on the litter detail. Does not touch any dog's status. */
export async function changeLitterStatusAction(litterId: string, status: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    if (!LITTER_STATUSES.includes(status as LitterStatus)) return { ok: false, fieldErrors: { status: { key: "invalidChoice" } } };
    return updateLitterStatus(kennelId, litterId, status as LitterStatus);
}

export async function deleteLitterAction(litterId: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    const result = await deleteLitter(kennelId, litterId);
    if (!result.ok) return result;
    redirect({ href: "/dashboard/litters?notice=deleted", locale: await getLocale() });
    return result;
}

/** "Add or link puppy" dialog: links one of the litter's linkable puppies. */
export async function linkPuppyAction(litterId: string, dogId: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    if (typeof dogId !== "string" || !dogId) return { ok: false, fieldErrors: { dogId: { key: "required" } } };
    const result = await linkPuppyToLitter(kennelId, litterId, dogId);
    if (result.ok) refresh();
    return result;
}
