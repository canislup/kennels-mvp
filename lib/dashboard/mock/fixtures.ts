// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only. Delete this folder once every lib/dashboard/*.ts
// function reads from Prisma.)
//
// Sample data taken from docs/design/dashboard/Overview.dc.html and
// Dogs.dc.html. Times are relative to "now" so the dashboard always looks current.
import { buildDogFixtures, KENNEL_BREEDS } from "./dogs";
import { buildLitterFixtures, buildWaitlistFixtures } from "./litters";
import { buildLeadFixtures } from "./leads";
import { buildConversationFixtures } from "./conversations";
import { buildMediaFixtures } from "./media";
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
    // Both derived in getNavCounts() (leads and conversations stores).
    const navCounts: NavCounts = { newLeads: 0, unreadMessages: 0 };

    const notifications: DashboardNotification[] = [
        { id: "ntf_1", type: "NEW_LEAD", params: { name: "Ricardo Alves" }, createdAt: ago(12 * MINUTE), read: false },
        { id: "ntf_2", type: "NEW_MESSAGE", params: { name: "Camila Torres", excerpt: "Is the chocolate male still available?" }, createdAt: ago(1 * HOUR), read: false },
        { id: "ntf_3", type: "NEW_REVIEW", params: { reviewerName: "Pedro Lima", rating: 5 }, createdAt: ago(3 * HOUR), read: false },
        { id: "ntf_4", type: "FOLLOW_UP_DUE", params: { leadName: "Ricardo Alves" }, createdAt: ago(5 * HOUR), read: false },
        { id: "ntf_5", type: "VERIFICATION_REMINDER", params: {}, createdAt: ago(2 * DAY), read: true },
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
        // newLeads is derived from the leads store in getOverview().
        newLeads: { count: 0, sinceYesterday: 0 },
        // unreadMessages is derived from the conversations store in getOverview().
        unreadMessages: { count: 0, oldestUnreadAt: null },
        // availablePuppies is derived from the dogs store in getOverview().
        availablePuppies: { count: 0, litterCount: 0 },
        activeLitters: { count: 2, nextGoHomeAt: dayFromToday(12) },
    };

    const recentActivity: ActivityItem[] = [
        { id: "act_1", type: "NEW_LEAD", params: { name: "Ricardo Alves", subject: "Nala and Marley’s next litter" }, createdAt: ago(12 * MINUTE) },
        { id: "act_2", type: "NEW_MESSAGE", params: { name: "Camila Torres", excerpt: "Is the chocolate male still available?" }, createdAt: ago(1 * HOUR) },
        { id: "act_3", type: "NEW_REVIEW", params: { reviewerName: "Pedro Lima", rating: 5 }, createdAt: ago(3 * HOUR) },
        { id: "act_4", type: "DOG_STATUS_CHANGED", params: { dogName: "Café", status: "RESERVED" }, createdAt: ago(1 * DAY + 2 * HOUR) },
        { id: "act_5", type: "LITTER_BORN", params: { damName: "Frida", puppyCount: 7 }, createdAt: ago(2 * DAY + 3 * HOUR) },
    ];

    // Coming up is derived from leads' follow-ups and litters' go-home dates in getOverview().
    const upcoming: UpcomingItem[] = [];
    const { leads, events: leadEvents, notes: leadNotes, reservations } = buildLeadFixtures();
    const { conversations, messages } = buildConversationFixtures();

    // Waitlist entries show up in the lead timelines too.
    const litters = buildLitterFixtures();
    const waitlist = buildWaitlistFixtures();
    for (const entry of waitlist) {
        const litterName = litters.find((l) => l.id === entry.litterId)?.name ?? "";
        leadEvents.push({ id: `evt_${entry.id}_added`, leadId: entry.leadId, type: "WAITLIST_ADDED", params: { litterId: entry.litterId, litterName }, createdAt: entry.createdAt });
    }

    return {
        navCounts,
        notifications,
        setupSteps,
        metrics,
        recentActivity,
        upcoming,
        kennelBreeds: KENNEL_BREEDS,
        litters,
        waitlist,
        dogs: buildDogFixtures(),
        leads,
        leadEvents,
        leadNotes,
        reservations,
        conversations,
        messages,
        media: buildMediaFixtures(),
    };
}

export type MockFixtures = ReturnType<typeof buildFixtures>;
