"use server";

// Server Actions for Settings → Kennel profile. The kennel comes from the
// session (getCurrentKennel), never from the form; the form's fields are
// whitelisted by parseKennelProfile.
import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { checkSlugAvailability, getKennelProfile, lookupAddress, saveKennelProfile } from "@/lib/dashboard/kennelProfile";
import { parseKennelProfile, validateKennelProfile, type KennelProfileFormValues } from "@/lib/dashboard/validation/kennelProfile";
import type { CurrentKennel, FieldError, GeocodeResult, SlugAvailability } from "@/lib/dashboard/types";

export type KennelProfileFormState = {
    status: "idle" | "error" | "saved";
    /** What was submitted, so a failed save keeps everything the user typed. */
    values: KennelProfileFormValues;
    fieldErrors: Record<string, FieldError>;
    formError?: FieldError;
    /** Increments on every submit (the form remounts its fields with it). */
    submission: number;
    /** Changes on every successful save (a new "unsaved changes" baseline). */
    savedAt?: number;
};

async function requireKennel(): Promise<CurrentKennel> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    return kennel!;
}

/**
 * The whole form in one go: validate everything, re-check the slug, the
 * breeds and the registration number against the database, then save every
 * section together. On any error nothing is written.
 */
export async function saveKennelProfileAction(previous: KennelProfileFormState, formData: FormData): Promise<KennelProfileFormState> {
    const kennel = await requireKennel();
    const values = parseKennelProfile(formData);
    const submission = previous.submission + 1;
    const profile = await getKennelProfile(kennel.id);
    if (!profile) return { status: "error", values, fieldErrors: {}, formError: { key: "kennelNotFound" }, submission };

    const validation = validateKennelProfile(values, {
        savedLogoUrl: profile.logo?.url ?? null,
        savedCoverUrl: profile.cover?.url ?? null,
        savedRegistrationType: profile.registration.type,
        currentYear: new Date().getFullYear(),
    });
    if (!validation.ok) return { status: "error", values, fieldErrors: validation.fieldErrors, submission };

    const result = await saveKennelProfile(kennel.id, validation.input);
    if (!result.ok) return { status: "error", values, fieldErrors: result.fieldErrors as Record<string, FieldError>, formError: result.formError, submission };

    // Re-render the page (preview, strength) and the shell (sidebar name and location).
    refresh();
    // The typed registration number is never sent back: the fresh mask shows instead.
    return { status: "saved", values: { ...values, registrationNumber: "" }, fieldErrors: {}, submission, savedAt: Date.now() };
}

/** The live "Available" indicator. The save re-checks on the server; this is only a hint. */
export async function checkSlugAction(slug: string): Promise<SlugAvailability> {
    const kennel = await requireKennel();
    if (typeof slug !== "string") return { available: false, reason: "invalid" };
    return checkSlugAvailability(kennel.id, slug.trim());
}

/** "Look up": coordinates for the typed address, or null when nothing was found. */
export async function lookupAddressAction(address: string): Promise<GeocodeResult | null> {
    await requireKennel();
    if (typeof address !== "string" || !address.trim() || address.length > 200) return null;
    return lookupAddress(address.trim());
}
