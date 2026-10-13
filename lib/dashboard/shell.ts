// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Data for the dashboard shell (sidebar badges, notifications bell).
import { getMockStore, snapshot } from "./mock/store";
import { countNewLeads } from "./leads";
import { getUnreadSummary } from "./messages";
import type { DashboardNotification, NavCounts } from "./types";

/** Sidebar badge counts: leads in stage New, and conversations with an unread inbound message. */
export async function getNavCounts(kennelId: string): Promise<NavCounts> {
    const [{ count }, unread] = await Promise.all([countNewLeads(kennelId), getUnreadSummary(kennelId)]);
    return snapshot({ newLeads: count, unreadMessages: unread.unreadConversations });
}

/** The 5 most recent notifications, newest first. */
export async function getNotifications(kennelId: string): Promise<DashboardNotification[]> {
    void kennelId;
    return snapshot(
        [...getMockStore().notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    );
}
