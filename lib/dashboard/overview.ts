// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Data for the Overview page (/dashboard). See ENDPOINTS.md for what each
// field implies for the backend.
import { getMockStore, snapshot } from "./mock/store";
import type { Overview, UpcomingItem } from "./types";

/**
 * Setup checklist, key metrics, the 5 latest activity items (newest first)
 * and the next 4 upcoming items (soonest first).
 */
export async function getOverview(kennelId: string): Promise<Overview> {
    void kennelId; // used by the real queries
    const store = getMockStore();
    const now = Date.now();

    // Derived from the dogs/litters stores so Overview agrees with the Dogs list.
    const availablePuppies = store.dogs.filter((dog) => dog.archivedAt === null && dog.status === "AVAILABLE_PUPPY");
    const activeLitters = store.litters.filter((litter) => litter.status === "AVAILABLE" || litter.status === "RESERVED");
    const goHomes = activeLitters
        .filter((litter) => litter.expectedGoHomeDate && Date.parse(litter.expectedGoHomeDate) >= now - 86_400_000)
        .sort((a, b) => a.expectedGoHomeDate!.localeCompare(b.expectedGoHomeDate!));

    const goHomeItems: UpcomingItem[] = goHomes.map((litter) => {
        const puppies = store.dogs.filter((dog) => dog.archivedAt === null && dog.litterId === litter.id);
        return {
            id: `up_gohome_${litter.id}`,
            type: "LITTER_GO_HOME",
            params: {
                litterName: `${litter.damName} × ${litter.sireName} · ${litter.name}`,
                puppyCount: puppies.length,
                reservedCount: puppies.filter((dog) => dog.status === "RESERVED").length,
            },
            dueAt: litter.expectedGoHomeDate!,
        };
    });

    return snapshot({
        setupSteps: store.setupSteps,
        metrics: {
            ...store.metrics,
            availablePuppies: {
                count: availablePuppies.length,
                litterCount: new Set(availablePuppies.map((dog) => dog.litterId).filter(Boolean)).size,
            },
            activeLitters: { count: activeLitters.length, nextGoHomeAt: goHomes[0]?.expectedGoHomeDate ?? null },
        },
        recentActivity: [...store.recentActivity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
        upcoming: [...store.upcoming, ...goHomeItems].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 4),
    });
}
