"use server";

// Server Actions for the Dogs list and Dog-Edit. Each one: resolves the
// signed-in kennel, parses FormData into an explicit typed input (never
// spreading raw input), validates on the server, then calls lib/dashboard.
import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import {
    archiveDog,
    createDog,
    deleteDog,
    getDogForEdit,
    getKennelBreeds,
    getLitterOptions,
    updateDog,
    updateDogStatus,
} from "@/lib/dashboard/dogs";
import { DOG_STATUSES, parseDogFormData, validateDogInput, type DogFieldErrors, type DogFormValues } from "@/lib/dashboard/validation/dog";
import type { DogStatus, FieldError, SimpleMutationResult } from "@/lib/dashboard/types";

export type DogFormState = {
    status: "idle" | "error" | "saved";
    values: DogFormValues;
    fieldErrors: DogFieldErrors;
    formError?: FieldError;
    /** Changes on every successful save, so the form can reset its "dirty" baseline. */
    savedAt?: number;
    /**
     * Increments on every submit. The form remounts its fields with it so they
     * pick up `values` as their defaults (React only applies a <select>'s
     * defaultValue on mount, and resets uncontrolled fields after an action).
     */
    submission?: number;
};

async function requireKennelId(): Promise<string> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    return kennel!.id;
}

/**
 * Create (dogId null) or update a dog. Bound with the dog id on the edit
 * page, so the id comes from the server render rather than a form field.
 */
export async function saveDogAction(dogId: string | null, previous: DogFormState, formData: FormData): Promise<DogFormState> {
    const kennelId = await requireKennelId();
    const values = parseDogFormData(formData);
    const submission = (previous.submission ?? 0) + 1;

    if (dogId && !(await getDogForEdit(kennelId, dogId))) {
        return { status: "error", values, fieldErrors: {}, formError: { key: "notFound" }, submission };
    }

    const [breeds, litters] = await Promise.all([getKennelBreeds(kennelId), getLitterOptions(kennelId)]);
    const validation = validateDogInput(values, { breedNames: breeds.map((b) => b.name), litterIds: litters.map((l) => l.id) });
    if (!validation.ok) return { status: "error", values, fieldErrors: validation.fieldErrors, submission };

    const result = dogId ? await updateDog(kennelId, dogId, validation.input) : await createDog(kennelId, validation.input);
    if (!result.ok) return { status: "error", values, fieldErrors: result.fieldErrors, formError: result.formError, submission };

    if (!dogId) {
        redirect({ href: "/dashboard/dogs?notice=created", locale: await getLocale() });
    }
    // Re-render the page (title, breadcrumb) with the saved name.
    refresh();
    return { status: "saved", values, fieldErrors: {}, savedAt: Date.now(), submission };
}

/** Quick status change from the Dogs list. */
export async function changeDogStatusAction(dogId: string, status: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    if (!DOG_STATUSES.includes(status as DogStatus)) {
        return { ok: false, fieldErrors: { status: { key: "invalidChoice" } } };
    }
    return updateDogStatus(kennelId, dogId, status as DogStatus);
}

export async function archiveDogAction(dogId: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    const result = await archiveDog(kennelId, dogId);
    if (!result.ok) return result;
    redirect({ href: "/dashboard/dogs?notice=archived", locale: await getLocale() });
    return result;
}

export async function deleteDogAction(dogId: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    const result = await deleteDog(kennelId, dogId);
    if (!result.ok) return result;
    redirect({ href: "/dashboard/dogs?notice=deleted", locale: await getLocale() });
    return result;
}
