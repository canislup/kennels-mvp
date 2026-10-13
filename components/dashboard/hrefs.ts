// Dashboard links shared by several screens, so each has one place to update.

/** A lead's page (board cards, litter waitlists, Overview follow-ups). */
export function leadHref(leadId: string): string {
    return `/dashboard/leads/${encodeURIComponent(leadId)}`;
}
