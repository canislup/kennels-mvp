// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Data for the Overview page (/dashboard). See ENDPOINTS.md for what each
// field implies for the backend.
import { getMockStore, snapshot } from "./mock/store";
import { dateOnlyToIso } from "./age";
import { computeLitterStats } from "./litters";
import { countNewLeads, getUpcomingFollowUps } from "./leads";
import { getUnreadSummary } from "./messages";
import type { Overview, UpcomingItem } from "./types";

/**
 * Setup checklist, key metrics, the 5 latest activity items (newest first)
 * and the next 4 upcoming items (soonest first).
 */
export async function getOverview(kennelId: string): Promise<Overview> {
    const store = getMockStore();

    // Derived from the dogs/litters stores so Overview agrees with Dogs and Litters.
    const availablePuppies = store.dogs.filter((dog) => dog.archivedAt === null && dog.status === "AVAILABLE_PUPPY");
    const activeLitters = store.litters.filter((litter) => litter.status === "AVAILABLE" || litter.status === "RESERVED");
    const today = new Date().toISOString().slice(0, 10);
    const goHomes = activeLitters
        .filter((litter) => litter.expectedGoHomeDate && litter.expectedGoHomeDate >= today)
        .sort((a, b) => a.expectedGoHomeDate!.localeCompare(b.expectedGoHomeDate!));

    const goHomeItems: UpcomingItem[] = goHomes.map((litter) => {
        const stats = computeLitterStats(litter);
        return {
            id: `up_gohome_${litter.id}`,
            type: "LITTER_GO_HOME",
            params: { litterId: litter.id, litterName: litter.name, puppyCount: stats.totalPuppies, reservedCount: stats.reserved },
            dueAt: dateOnlyToIso(litter.expectedGoHomeDate!),
        };
    });

    const [newLeads, followUps, unread] = await Promise.all([countNewLeads(kennelId), getUpcomingFollowUps(kennelId, 4), getUnreadSummary(kennelId)]);
    const followUpItems: UpcomingItem[] = followUps.map((item) => ({
        id: `up_followup_${item.leadId}`,
        type: "LEAD_FOLLOW_UP",
        params: { leadId: item.leadId, leadName: item.name },
        dueAt: dateOnlyToIso(item.followUpAt),
    }));

    return snapshot({
        setupSteps: store.setupSteps,
        metrics: {
            ...store.metrics,
            newLeads,
            unreadMessages: { count: unread.unreadConversations, oldestUnreadAt: unread.oldestUnreadAt },
            availablePuppies: {
                count: availablePuppies.length,
                litterCount: new Set(availablePuppies.map((dog) => dog.litterId).filter(Boolean)).size,
            },
            activeLitters: { count: activeLitters.length, nextGoHomeAt: goHomeItems[0]?.dueAt ?? null },
        },
        recentActivity: [...store.recentActivity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
        // Follow-ups (overdue first) and go-home dates, by date, at most 4.
        upcoming: [...followUpItems, ...goHomeItems].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 4),
    });
}
