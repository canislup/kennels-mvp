// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Dogs list + Dog-Edit. Reads are called from Server Components; mutations
// are called from the Server Actions in app/[locale]/dashboard/dogs/actions.ts,
// which have already parsed FormData into a whitelisted, validated DogInput.
// See ENDPOINTS.md for the backend contract of each function.
import { nextAvailableSlug, slugify } from "@/lib/slug";
import { getMockStore, snapshot } from "./mock/store";
import type { MockDog } from "./mock/dogs";
import type {
    DogForEdit,
    DogInput,
    DogListFilters,
    DogListItem,
    DogListResult,
    DogMutationResult,
    DogStatus,
    DogStatusCounts,
    KennelBreedOption,
    LitterOption,
    SimpleMutationResult,
} from "./types";

/** Lowercase, accents stripped: "Pérola" matches "perola". */
const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const activeDogs = () => getMockStore().dogs.filter((dog) => dog.archivedAt === null);

const toListItem = (dog: MockDog): DogListItem => ({
    id: dog.id,
    name: dog.name,
    breed: dog.breed,
    sex: dog.sex,
    lifeStage: dog.lifeStage,
    birthDate: dog.birthDate,
    status: dog.status,
    coverPhotoUrl: dog.photos[0] ?? null,
});

const toForEdit = (dog: MockDog): DogForEdit => {
    const { createdAt, ...rest } = dog;
    void createdAt; // internal sort key, not part of the form
    return rest;
};

const notFound = (): SimpleMutationResult => ({ ok: false, fieldErrors: {}, formError: { key: "notFound" } });

// --- Reads -------------------------------------------------------------------

/** One page of the roster, newest first. Archived dogs are excluded. */
export async function listDogs(kennelId: string, filters: DogListFilters): Promise<DogListResult> {
    void kennelId;
    const q = filters.q ? fold(filters.q.trim()) : "";
    const matches = activeDogs()
        .filter((dog) => !filters.status || dog.status === filters.status)
        .filter((dog) => !filters.breed || dog.breed === filters.breed)
        .filter((dog) => !filters.sex || dog.sex === filters.sex)
        .filter((dog) => !filters.stage || dog.lifeStage === filters.stage)
        .filter((dog) => !q || fold(dog.name).includes(q) || fold(dog.registry ?? "").includes(q))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const start = (filters.page - 1) * filters.pageSize;
    return snapshot({
        items: matches.slice(start, start + filters.pageSize).map(toListItem),
        total: matches.length,
        page: filters.page,
        pageSize: filters.pageSize,
    });
}

/** Counts per status for the whole (non-archived) roster; ignores other filters. */
export async function getDogStatusCounts(kennelId: string): Promise<DogStatusCounts> {
    void kennelId;
    const dogs = activeDogs();
    const count = (status: DogStatus) => dogs.filter((dog) => dog.status === status).length;
    return {
        all: dogs.length,
        breedingStock: count("BREEDING_STOCK"),
        availablePuppy: count("AVAILABLE_PUPPY"),
        reserved: count("RESERVED"),
        sold: count("SOLD"),
    };
}

/** Full form data, or null if the dog doesn't exist or isn't this kennel's. Includes archived dogs. */
export async function getDogForEdit(kennelId: string, dogId: string): Promise<DogForEdit | null> {
    void kennelId;
    const dog = getMockStore().dogs.find((d) => d.id === dogId);
    return dog ? snapshot(toForEdit(dog)) : null;
}

/** Breeds this kennel raises (KennelBreed), alphabetical. */
export async function getKennelBreeds(kennelId: string): Promise<KennelBreedOption[]> {
    void kennelId;
    return snapshot([...getMockStore().kennelBreeds].sort((a, b) => a.name.localeCompare(b.name)));
}

/** Litters for the puppy litter selector, newest first (planned litters last). */
export async function getLitterOptions(kennelId: string): Promise<LitterOption[]> {
    void kennelId;
    return getMockStore()
        .litters.map((litter) => ({
            id: litter.id,
            label: `${litter.damName} × ${litter.sireName} · ${litter.name}`,
            bornAt: litter.bornAt,
        }))
        .sort((a, b) => (b.bornAt ?? "").localeCompare(a.bornAt ?? ""));
}

// --- Mutations -----------------------------------------------------------------

/** Creates a dog. The slug is generated once from the name and never changes. */
export async function createDog(kennelId: string, input: DogInput): Promise<DogMutationResult> {
    void kennelId;
    const store = getMockStore();
    const slug = nextAvailableSlug(slugify(input.name), new Set(store.dogs.map((d) => d.slug)));
    const dog: MockDog = {
        ...input,
        id: `dog_${crypto.randomUUID()}`,
        slug,
        archivedAt: null,
        createdAt: new Date().toISOString(),
    };
    store.dogs.push(dog);
    return { ok: true, dog: { id: dog.id, slug: dog.slug } };
}

/** Replaces the editable fields. `slug` is left untouched on rename so public links keep working. */
export async function updateDog(kennelId: string, dogId: string, input: DogInput): Promise<DogMutationResult> {
    void kennelId;
    const dog = getMockStore().dogs.find((d) => d.id === dogId);
    if (!dog) return { ok: false, fieldErrors: {}, formError: { key: "notFound" } };
    Object.assign(dog, input);
    return { ok: true, dog: { id: dog.id, slug: dog.slug } };
}

export async function updateDogStatus(kennelId: string, dogId: string, status: DogStatus): Promise<SimpleMutationResult> {
    void kennelId;
    const dog = getMockStore().dogs.find((d) => d.id === dogId);
    if (!dog) return notFound();
    dog.status = status;
    return { ok: true };
}

/** Soft delete: hides the dog from the roster and the public site, keeps the record. */
export async function archiveDog(kennelId: string, dogId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const dog = getMockStore().dogs.find((d) => d.id === dogId);
    if (!dog) return notFound();
    dog.archivedAt = new Date().toISOString();
    return { ok: true };
}

/** Hard delete, including the dog's photos and documents. */
export async function deleteDog(kennelId: string, dogId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const index = store.dogs.findIndex((d) => d.id === dogId);
    if (index === -1) return notFound();
    store.dogs.splice(index, 1);
    return { ok: true };
}
