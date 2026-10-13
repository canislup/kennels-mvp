// Dashboard links that point at screens not built yet live here, so each
// has exactly one place to update.

/** "Open lead" (Litters waitlist). */
export function leadHref(leadId: string): string {
    void leadId;
    // TODO(step 4): return `/dashboard/leads/${leadId}` once Leads-Detail exists.
    return "/dashboard/leads";
}
