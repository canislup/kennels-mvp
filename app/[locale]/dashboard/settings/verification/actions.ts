"use server";

// Server Actions for Settings → Verification. Success redirects with a
// one-time notice (which also drops the dev-only ?state= preview param).
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { submitVerification, withdrawVerification } from "@/lib/dashboard/verification";
import { validateVerificationInput } from "@/lib/dashboard/validation/verification";
import { failed } from "@/lib/dashboard/actionState";
import type { ActionState, SimpleMutationResult } from "@/lib/dashboard/types";

export type VerificationFormState = ActionState & { values?: { cbkcRegistration: string; documentUrls: string[] } };

async function requireKennelId(): Promise<string> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    return kennel!.id;
}

/** Submit or resubmit (from NOT_SUBMITTED or REJECTED). */
export async function submitVerificationAction(previous: VerificationFormState, formData: FormData): Promise<VerificationFormState> {
    const kennelId = await requireKennelId();
    const validation = validateVerificationInput(formData);
    if (!validation.ok) return { ...failed(previous, validation.fieldErrors), values: validation.values };
    const result = await submitVerification(kennelId, validation.input);
    if (!result.ok) {
        return {
            ...failed(previous, result.fieldErrors as ActionState["fieldErrors"], result.formError),
            values: { cbkcRegistration: validation.input.cbkcRegistration ?? "", documentUrls: validation.input.documentUrls },
        };
    }
    redirect({ href: "/dashboard/settings/verification?notice=submitted", locale: await getLocale() });
    return previous;
}

/** PENDING back to NOT_SUBMITTED (ConfirmDialog). */
export async function withdrawVerificationAction(): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    const result = await withdrawVerification(kennelId);
    if (result.ok) redirect({ href: "/dashboard/settings/verification?notice=withdrawn", locale: await getLocale() });
    return result;
}
