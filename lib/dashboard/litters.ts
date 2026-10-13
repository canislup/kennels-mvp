// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Litters list + detail + litter form. Reads are called from Server
// Components; mutations from the Server Actions in
// app/[locale]/dashboard/litters/actions.ts, which have already parsed
// FormData into a whitelisted, validated LitterInput. Every count here is
// computed from linked puppies and waitlist entries (see ENDPOINTS.md).
import { ageOf } from "./age";
import { getMockStore, snapshot } from "./mock/store";
import type { MockDog } from "./mock/dogs";
import type { MockLitter } from "./mock/litters";
import type {
    LinkablePuppy,
    LitterDetail,
    LitterForEdit,
    LitterFormOptions,
    LitterInput,
    LitterListItem,
    LitterMutationResult,
    LitterParentSummary,
    LitterPuppy,
    LitterStats,
    LitterStatus,
    LitterStatusCounts,
    SimpleMutationResult,
    WaitlistEntry,
} from "./types";

const notFound = (): SimpleMutationResult => ({ ok: false, fieldErrors: {}, formError: { key: "notFound" } });

const findDog = (id: string | null) => (id ? getMockStore().dogs.find((dog) => dog.id === id) : undefined);

/** Non-archived puppies linked to this litter. */
const linkedPuppies = (litterId: string) => getMockStore().dogs.filter((dog) => dog.litterId === litterId && dog.archivedAt === null);

/** The numbers shown on list cards, stat tiles and Overview. */
export function computeLitterStats(litter: Pick<MockLitter, "id" | "puppyCount">): LitterStats {
    const puppies = linkedPuppies(litter.id);
    const totalPuppies = Math.max(litter.puppyCount, puppies.length);
    const available = puppies.filter((dog) => dog.status === "AVAILABLE_PUPPY").length;
    return {
        totalPuppies,
        available,
        reserved: puppies.filter((dog) => dog.status === "RESERVED").length,
        onWaitlist: getMockStore().waitlist.filter((entry) => entry.litterId === litter.id).length,
        placedShare: totalPuppies === 0 ? 0 : (totalPuppies - available) / totalPuppies,
    };
}

/** "Pérola × Marley · Autumn litter" (names only, no translated words). */
export function litterLabel(litter: MockLitter): string {
    const parents = [findDog(litter.damId)?.name, findDog(litter.sireId)?.name].filter(Boolean).join(" × ");
    return parents ? `${parents} · ${litter.name}` : litter.name;
}

const toListItem = (litter: MockLitter): LitterListItem => ({
    id: litter.id,
    name: litter.name,
    breed: litter.breed,
    status: litter.status,
    damName: findDog(litter.damId)?.name ?? null,
    sireName: findDog(litter.sireId)?.name ?? null,
    birthDate: litter.birthDate,
    expectedGoHomeDate: litter.expectedGoHomeDate,
    stats: computeLitterStats(litter),
});

const toParent = (dog: MockDog | undefined): LitterParentSummary | null =>
    dog
        ? { id: dog.id, name: dog.name, breed: dog.breed, ageLabelParts: ageOf(dog.birthDate, new Date()), coverPhotoUrl: dog.photos[0] ?? null }
        : null;

const toPuppy = (dog: MockDog): LitterPuppy => ({ id: dog.id, name: dog.name, sex: dog.sex, status: dog.status, coverPhotoUrl: dog.photos[0] ?? null });

const newestFirst = (a: MockLitter, b: MockLitter) => b.createdAt.localeCompare(a.createdAt);

// --- Reads -------------------------------------------------------------------

/** The kennel's litters, newest first, optionally one status only. */
export async function listLitters(kennelId: string, filters: { status?: LitterStatus } = {}): Promise<LitterListItem[]> {
    void kennelId;
    return snapshot(
        getMockStore()
            .litters.filter((litter) => !filters.status || litter.status === filters.status)
            .sort(newestFirst)
            .map(toListItem),
    );
}

/** Counts per status for all litters (ignores the status filter). */
export async function getLitterStatusCounts(kennelId: string): Promise<LitterStatusCounts> {
    void kennelId;
    const litters = getMockStore().litters;
    const count = (status: LitterStatus) => litters.filter((litter) => litter.status === status).length;
    return { all: litters.length, planned: count("PLANNED"), available: count("AVAILABLE"), reserved: count("RESERVED"), soldOut: count("SOLD_OUT") };
}

/** Litter + parents + linked puppies, or null if it doesn't exist or isn't this kennel's. */
export async function getLitterDetail(kennelId: string, litterId: string): Promise<LitterDetail | null> {
    void kennelId;
    const litter = getMockStore().litters.find((l) => l.id === litterId);
    if (!litter) return null;
    return snapshot({
        ...toListItem(litter),
        puppyCount: litter.puppyCount,
        dam: toParent(findDog(litter.damId)),
        sire: toParent(findDog(litter.sireId)),
        puppies: linkedPuppies(litter.id)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(toPuppy),
    });
}

/** Waitlist for a litter, by position. Read-only until the Leads step. */
export async function getLitterWaitlist(kennelId: string, litterId: string): Promise<WaitlistEntry[]> {
    void kennelId;
    return snapshot(
        getMockStore()
            .waitlist.filter((entry) => entry.litterId === litterId)
            .sort((a, b) => a.position - b.position)
            .map(({ id, position, leadId, name, note, createdAt }) => ({ id, position, leadId, name, note, createdAt })),
    );
}

export async function getLitterForEdit(kennelId: string, litterId: string): Promise<LitterForEdit | null> {
    void kennelId;
    const litter = getMockStore().litters.find((l) => l.id === litterId);
    if (!litter) return null;
    const { id, name, breed, status, damId, sireId, birthDate, expectedGoHomeDate, puppyCount } = litter;
    return snapshot({ id, name, breed, status, damId, sireId, birthDate, expectedGoHomeDate, puppyCount });
}

/** Breeds plus possible parents: adult, non-archived dogs of each sex, with their breed. */
export async function getLitterFormOptions(kennelId: string): Promise<LitterFormOptions> {
    void kennelId;
    const store = getMockStore();
    const adults = store.dogs
        .filter((dog) => dog.lifeStage === "ADULT" && dog.archivedAt === null)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((dog) => ({ id: dog.id, name: dog.name, breed: dog.breed, sex: dog.sex }));
    const strip = ({ id, name, breed }: (typeof adults)[number]) => ({ id, name, breed });
    return snapshot({
        breeds: [...store.kennelBreeds].sort((a, b) => a.name.localeCompare(b.name)),
        females: adults.filter((dog) => dog.sex === "FEMALE").map(strip),
        males: adults.filter((dog) => dog.sex === "MALE").map(strip),
    });
}

/** Puppies of the litter's breed with no litter yet (not archived). */
export async function getLinkablePuppies(kennelId: string, litterId: string): Promise<LinkablePuppy[]> {
    void kennelId;
    const store = getMockStore();
    const litter = store.litters.find((l) => l.id === litterId);
    if (!litter) return [];
    return snapshot(
        store.dogs
            .filter((dog) => dog.lifeStage === "PUPPY" && dog.archivedAt === null && dog.litterId === null && dog.breed === litter.breed)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(toPuppy),
    );
}

// --- Mutations -----------------------------------------------------------------

export async function createLitter(kennelId: string, input: LitterInput): Promise<LitterMutationResult> {
    void kennelId;
    const litter: MockLitter = { ...input, id: `ltr_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    getMockStore().litters.push(litter);
    return { ok: true, litter: { id: litter.id } };
}

export async function updateLitter(kennelId: string, litterId: string, input: LitterInput): Promise<LitterMutationResult> {
    void kennelId;
    const litter = getMockStore().litters.find((l) => l.id === litterId);
    if (!litter) return { ok: false, fieldErrors: {}, formError: { key: "notFound" } };
    Object.assign(litter, input);
    return { ok: true, litter: { id: litter.id } };
}

/** Changes only the litter's status. Puppies' own statuses are independent and untouched. */
export async function updateLitterStatus(kennelId: string, litterId: string, status: LitterStatus): Promise<SimpleMutationResult> {
    void kennelId;
    const litter = getMockStore().litters.find((l) => l.id === litterId);
    if (!litter) return notFound();
    litter.status = status;
    return { ok: true };
}

/** Deletes the litter and its waitlist. Puppies are unlinked (litterId → null), never deleted. */
export async function deleteLitter(kennelId: string, litterId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const index = store.litters.findIndex((l) => l.id === litterId);
    if (index === -1) return notFound();
    for (const dog of store.dogs) if (dog.litterId === litterId) dog.litterId = null;
    store.waitlist = store.waitlist.filter((entry) => entry.litterId !== litterId);
    store.litters.splice(index, 1);
    return { ok: true };
}

/** Links an existing puppy: same kennel, same breed, a puppy, not archived, not already in a litter. */
export async function linkPuppyToLitter(kennelId: string, litterId: string, dogId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const litter = store.litters.find((l) => l.id === litterId);
    const dog = store.dogs.find((d) => d.id === dogId);
    if (!litter || !dog) return notFound();
    if (dog.lifeStage !== "PUPPY" || dog.archivedAt !== null || dog.litterId !== null || dog.breed !== litter.breed) {
        return { ok: false, fieldErrors: {}, formError: { key: "puppyNotLinkable" } };
    }
    dog.litterId = litter.id;
    return { ok: true };
}
