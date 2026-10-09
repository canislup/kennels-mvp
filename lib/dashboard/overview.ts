// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Data for the Overview page (/dashboard). See ENDPOINTS.md for what each
// field implies for the backend.
import { getMockStore, snapshot } from "./mock/store";
import type { Overview } from "./types";

/**
 * Setup checklist, key metrics, the 5 latest activity items (newest first)
 * and the next 4 upcoming items (soonest first).
 */
export async function getOverview(kennelId: string): Promise<Overview> {
    void kennelId; // used by the real queries
    const store = getMockStore();
    return snapshot({
        setupSteps: store.setupSteps,
        metrics: store.metrics,
        recentActivity: [...store.recentActivity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
        upcoming: [...store.upcoming].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 4),
    });
}
