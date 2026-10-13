// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Which notifications the owner also gets by email. Stored, but with no effect
// until an email provider exists (in-app alerts are always on).
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./mock/settings";
import { getMockStore } from "./mock/store";
import type { NotificationPreference, NotificationPreferenceType, SimpleMutationResult } from "./types";

export const NOTIFICATION_PREFERENCE_TYPES: readonly NotificationPreferenceType[] = ["NEW_LEAD", "NEW_MESSAGE", "NEW_REVIEW", "WAITLIST_ACTIVITY", "VERIFICATION_UPDATE"];

/** One entry per type, in display order. Types never saved use the defaults (all on except waitlist activity). */
export async function getNotificationPreferences(ownerId: string): Promise<NotificationPreference[]> {
    const saved = getMockStore().notificationPreferences[ownerId] ?? DEFAULT_NOTIFICATION_PREFERENCES;
    return NOTIFICATION_PREFERENCE_TYPES.map((type) => ({ type, emailEnabled: saved[type] ?? DEFAULT_NOTIFICATION_PREFERENCES[type] }));
}

/** Replaces all five preferences (upsert per type in the real version). */
export async function updateNotificationPreferences(ownerId: string, prefs: NotificationPreference[]): Promise<SimpleMutationResult> {
    const next = { ...DEFAULT_NOTIFICATION_PREFERENCES };
    for (const pref of prefs) if (NOTIFICATION_PREFERENCE_TYPES.includes(pref.type)) next[pref.type] = pref.emailEnabled;
    getMockStore().notificationPreferences[ownerId] = next;
    return { ok: true };
}
