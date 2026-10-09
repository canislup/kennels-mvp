// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only. Delete this folder once every lib/dashboard/*.ts
// function reads from Prisma.)
//
// Sample data taken from docs/design/dashboard/Overview.dc.html. Times are
// relative to "now" so the dashboard always looks current.
import type { ActivityItem, DashboardNotification, NavCounts, OverviewMetrics, SetupStep, UpcomingItem } from "../types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
/** Start-of-day `days` from today, at the given hour (local server time). */
const dayFromToday = (days: number, hour = 10) => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date.toISOString();
};

export function buildFixtures() {
    const navCounts: NavCounts = { newLeads: 7, unreadMessages: 3 };

    const notifications: DashboardNotification[] = [
        { id: "ntf_1", title: "New lead: Ricardo Alves", detail: "Asked about Nala and Marley’s next litter", createdAt: ago(12 * MINUTE), read: false },
        { id: "ntf_2", title: "Camila Torres sent a message", detail: "“Is the chocolate male still available?”", createdAt: ago(1 * HOUR), read: false },
        { id: "ntf_3", title: "New 5-star review", detail: "Pedro and Lia left a review", createdAt: ago(3 * HOUR), read: false },
        { id: "ntf_4", title: "Follow-up due today", detail: "Ricardo Alves", createdAt: ago(5 * HOUR), read: false },
        { id: "ntf_5", title: "Verification request reminder", detail: "Request verification to finish your profile", createdAt: ago(2 * DAY), read: true },
    ];

    const setupSteps: SetupStep[] = [
        { key: "kennelDetails", done: true },
        { key: "logoAndCover", done: true },
        { key: "breeds", done: true },
        { key: "firstDog", done: true },
        { key: "photos", done: true },
        { key: "verification", done: false },
    ];

    const metrics: OverviewMetrics = {
        newLeads: { count: 7, sinceYesterday: 3 },
        unreadMessages: { count: 3, oldestUnreadAt: ago(2 * DAY + 2 * HOUR) },
        availablePuppies: { count: 9, litterCount: 2 },
        activeLitters: { count: 2, nextGoHomeAt: dayFromToday(12) },
    };

    const recentActivity: ActivityItem[] = [
        { id: "act_1", type: "NEW_LEAD", params: { name: "Ricardo Alves", subject: "Nala and Marley’s next litter" }, createdAt: ago(12 * MINUTE) },
        { id: "act_2", type: "NEW_MESSAGE", params: { name: "Camila Torres", excerpt: "Is the chocolate male still available?" }, createdAt: ago(1 * HOUR) },
        { id: "act_3", type: "NEW_REVIEW", params: { authorName: "Pedro and Lia", rating: 5 }, createdAt: ago(3 * HOUR) },
        { id: "act_4", type: "DOG_STATUS_CHANGED", params: { dogName: "Café", status: "RESERVED" }, createdAt: ago(1 * DAY + 2 * HOUR) },
        { id: "act_5", type: "LITTER_BORN", params: { damName: "Pérola", puppyCount: 6 }, createdAt: ago(2 * DAY + 3 * HOUR) },
    ];

    const upcoming: UpcomingItem[] = [
        { id: "up_1", type: "LEAD_FOLLOW_UP", params: { leadName: "Ricardo Alves" }, dueAt: dayFromToday(0) },
        { id: "up_2", type: "LEAD_FOLLOW_UP", params: { leadName: "Marina Costa" }, dueAt: dayFromToday(1) },
        { id: "up_3", type: "LEAD_FOLLOW_UP", params: { leadName: "Camila Torres" }, dueAt: dayFromToday(3) },
        { id: "up_4", type: "LITTER_GO_HOME", params: { litterName: "Nala and Marley litter", puppyCount: 5, reservedCount: 4 }, dueAt: dayFromToday(12) },
    ];

    return { navCounts, notifications, setupSteps, metrics, recentActivity, upcoming };
}

export type MockFixtures = ReturnType<typeof buildFixtures>;
