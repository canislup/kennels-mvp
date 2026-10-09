// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Data for the dashboard shell (sidebar badges, notifications bell).
import { getMockStore, snapshot } from "./mock/store";
import type { DashboardNotification, NavCounts } from "./types";

/** Sidebar badge counts. Real version: count NEW leads and unread messages for the kennel. */
export async function getNavCounts(kennelId: string): Promise<NavCounts> {
    void kennelId; // used by the real query
    return snapshot(getMockStore().navCounts);
}

/** The 5 most recent notifications, newest first. */
export async function getNotifications(kennelId: string): Promise<DashboardNotification[]> {
    void kennelId;
    return snapshot(
        [...getMockStore().notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    );
}
