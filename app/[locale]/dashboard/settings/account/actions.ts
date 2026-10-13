"use server";

// Server Actions for Settings → Account. The owner and kennel come from the
// session (getCurrentKennel), never from the form.
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { changePassword, requestAccountDeletion, updateAccount } from "@/lib/dashboard/account";
import { parseAccountDetails, parsePasswordChange, validateAccountDetails, validatePasswordChange } from "@/lib/dashboard/validation/account";
import { textField } from "@/lib/dashboard/validation/common";
import { failed } from "@/lib/dashboard/actionState";
import type { Account, ActionState, CurrentKennel } from "@/lib/dashboard/types";

export type AccountFormState = ActionState & { values?: Account };

async function requireKennel(): Promise<CurrentKennel> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    return kennel!;
}

/** Name, email, language. A changed language redirects to this page in the new locale. */
export async function saveAccountAction(previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
    const kennel = await requireKennel();
    const values = parseAccountDetails(formData);
    const fieldErrors = validateAccountDetails(values);
    if (Object.keys(fieldErrors).length > 0) return { ...failed(previous, fieldErrors), values };

    const result = await updateAccount(kennel.ownerId, values);
    if (!result.ok) return { ...failed(previous, result.fieldErrors as ActionState["fieldErrors"], result.formError), values };

    if (values.locale !== (await getLocale())) {
        // Same cookie the middleware and the EN | PT switcher use, so the choice sticks.
        (await cookies()).set("NEXT_LOCALE", values.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
        redirect({ href: "/dashboard/settings/account?notice=saved", locale: values.locale });
    }
    // Re-render the shell too (the sidebar shows the owner's name).
    refresh();
    return { status: "done", fieldErrors: {}, submission: previous.submission + 1, values };
}

/** Never returns password values: after any result the fields come back empty. */
export async function changePasswordAction(previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennel = await requireKennel();
    const input = parsePasswordChange(formData);
    const fieldErrors = validatePasswordChange(input);
    if (Object.keys(fieldErrors).length > 0) return failed(previous, fieldErrors);
    const result = await changePassword(kennel.ownerId, input);
    if (!result.ok) return failed(previous, result.fieldErrors as ActionState["fieldErrors"], result.formError);
    return { status: "done", fieldErrors: {}, submission: previous.submission + 1 };
}

/** Checks the typed kennel name. The mock deletes nothing; the UI says so. */
export async function deleteAccountAction(previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennel = await requireKennel();
    const result = await requestAccountDeletion(kennel.ownerId, kennel.id, { confirmName: textField(formData, "confirmName") });
    if (!result.ok) return failed(previous, result.fieldErrors as ActionState["fieldErrors"], result.formError);
    return { status: "done", fieldErrors: {}, submission: previous.submission + 1 };
}
