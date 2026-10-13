// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// The kennel-wide gallery (photos and video links) shown on the public kennel
// page. Reads are called from Server Components; mutations from
// app/[locale]/dashboard/media/actions.ts, which has already validated input.
import { getMockStore, snapshot } from "./mock/store";
import type { MockMedia } from "./mock/media";
import type { MediaFilterOptions, MediaItem, MediaKind, MediaListResult, PhotoUpload, SimpleMutationResult, VideoProvider } from "./types";

const byPosition = (a: MockMedia, b: MockMedia) => a.position - b.position || a.createdAt.localeCompare(b.createdAt);

function toItem(media: MockMedia): MediaItem {
    const dog = media.dogId ? getMockStore().dogs.find((d) => d.id === media.dogId) : undefined;
    return { ...media, dogName: dog?.name ?? null };
}

const ofType = (type: MediaKind) => getMockStore().media.filter((m) => m.type === type).sort(byPosition);

/** Re-number positions 0..n-1 within a type (after deletes and moves). */
function renumber(type: MediaKind) {
    ofType(type).forEach((m, i) => (m.position = i));
}

// --- Reads ---------------------------------------------------------------------------

export async function listMedia(kennelId: string, filters: { type: MediaKind; breed?: string; dogId?: string; page: number; pageSize: number }): Promise<MediaListResult> {
    void kennelId;
    const matches = ofType(filters.type).filter((m) => (!filters.breed || m.breed === filters.breed) && (!filters.dogId || m.dogId === filters.dogId));
    const start = (filters.page - 1) * filters.pageSize;
    return snapshot({ items: matches.slice(start, start + filters.pageSize).map(toItem), total: matches.length, page: filters.page, pageSize: filters.pageSize });
}

export async function getMediaCounts(kennelId: string): Promise<{ photos: number; videos: number }> {
    void kennelId;
    return { photos: ofType("PHOTO").length, videos: ofType("VIDEO").length };
}

/** Breeds the kennel raises, and its non-archived dogs with their breed (for the tag selects). */
export async function getMediaFilterOptions(kennelId: string): Promise<MediaFilterOptions> {
    void kennelId;
    const store = getMockStore();
    return snapshot({
        breeds: [...store.kennelBreeds].sort((a, b) => a.name.localeCompare(b.name)),
        dogs: store.dogs
            .filter((d) => d.archivedAt === null)
            .map(({ id, name, breed }) => ({ id, name, breed }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    });
}

// --- Mutations -----------------------------------------------------------------------

/** Appends uploaded photos after the last one, untagged. */
export async function addPhotos(kennelId: string, uploads: PhotoUpload[]): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    let position = ofType("PHOTO").length;
    for (const upload of uploads) {
        store.media.push({ id: `media_${crypto.randomUUID()}`, type: "PHOTO", url: upload.url, caption: null, breed: null, dogId: null, position: position++, createdAt: new Date().toISOString(), provider: null, thumbnailUrl: null });
    }
    return { ok: true };
}

export async function addVideoLink(kennelId: string, input: { url: string; provider: VideoProvider; title: string; breed: string | null; dogId: string | null }): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    store.media.push({
        id: `media_${crypto.randomUUID()}`,
        type: "VIDEO",
        url: input.url,
        caption: input.title,
        breed: input.breed,
        dogId: input.dogId,
        position: ofType("VIDEO").length,
        createdAt: new Date().toISOString(),
        provider: input.provider,
        thumbnailUrl: null,
    });
    return { ok: true };
}

export async function updateMedia(kennelId: string, id: string, input: { caption: string | null; breed: string | null; dogId: string | null }): Promise<SimpleMutationResult> {
    void kennelId;
    const media = getMockStore().media.find((m) => m.id === id);
    if (!media) return { ok: false, fieldErrors: {}, formError: { key: "notFound" } };
    Object.assign(media, input);
    return { ok: true };
}

/** Bulk tag (≤ 100 ids). Ids that aren't this kennel's are ignored by the real query (`where kennelId`). */
export async function tagMedia(kennelId: string, ids: string[], tags: { breed: string | null; dogId: string | null }): Promise<SimpleMutationResult> {
    void kennelId;
    for (const media of getMockStore().media) if (ids.includes(media.id)) Object.assign(media, tags);
    return { ok: true };
}

/** Bulk delete (≤ 100 ids). The real backend also deletes the Cloudinary assets (see ENDPOINTS.md). */
export async function deleteMedia(kennelId: string, ids: string[]): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const types = new Set(store.media.filter((m) => ids.includes(m.id)).map((m) => m.type));
    store.media = store.media.filter((m) => !ids.includes(m.id));
    for (const type of types) renumber(type);
    return { ok: true };
}

/** Moves a photo to `toIndex` among all photos (0 = first), shifting the others. */
export async function moveMedia(kennelId: string, id: string, toIndex: number): Promise<SimpleMutationResult> {
    void kennelId;
    const media = getMockStore().media.find((m) => m.id === id);
    if (!media) return { ok: false, fieldErrors: {}, formError: { key: "notFound" } };
    const ordered = ofType(media.type).filter((m) => m.id !== id);
    const index = Math.max(0, Math.min(toIndex, ordered.length));
    ordered.splice(index, 0, media);
    ordered.forEach((m, i) => (m.position = i));
    return { ok: true };
}
