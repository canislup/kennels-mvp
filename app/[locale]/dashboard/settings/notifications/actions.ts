"use server";

// Server Action for Settings → Notifications. Whitelists the five types; a
// checked switch posts "on", an unchecked one posts nothing.
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { NOTIFICATION_PREFERENCE_TYPES, updateNotificationPreferences } from "@/lib/dashboard/notificationPreferences";
import { failed } from "@/lib/dashboard/actionState";
import type { ActionState, NotificationPreference } from "@/lib/dashboard/types";

export type PreferencesFormState = ActionState & { values?: NotificationPreference[]; savedAt?: number };

export async function savePreferencesAction(previous: PreferencesFormState, formData: FormData): Promise<PreferencesFormState> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    const prefs = NOTIFICATION_PREFERENCE_TYPES.map((type) => ({ type, emailEnabled: formData.get(type) === "on" }));
    const result = await updateNotificationPreferences(kennel!.ownerId, prefs);
    if (!result.ok) return { ...failed(previous, result.fieldErrors as ActionState["fieldErrors"], result.formError), values: prefs };
    return { status: "done", fieldErrors: {}, submission: previous.submission + 1, values: prefs, savedAt: Date.now() };
}
