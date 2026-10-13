"use server";

// Server Actions for the Media gallery. Each resolves the signed-in kennel
// and validates on the server; the data layer checks again that every id,
// breed and dog belongs to the kennel.
import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { addPhotos, addVideoLink, deleteMedia, getMediaFilterOptions, moveMedia, tagMedia, updateMedia } from "@/lib/dashboard/media";
import { MEDIA_LIMITS, resolveTags, videoProviderOf } from "@/lib/dashboard/validation/media";
import { failed, fromResult } from "@/lib/dashboard/actionState";
import type { ActionState, PhotoUpload, SimpleMutationResult } from "@/lib/dashboard/types";

async function requireKennelId(): Promise<string> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    return kennel!.id;
}

const text = (formData: FormData, key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
};

const tooMany = (): SimpleMutationResult => ({ ok: false, fieldErrors: {}, formError: { key: "tooManySelected", params: { max: MEDIA_LIMITS.bulkIds } } });
const validIds = (ids: unknown): ids is string[] => Array.isArray(ids) && ids.every((id) => typeof id === "string");

/** After the upload widget finishes: store the uploaded photos (https Cloudinary URLs only). */
export async function addPhotosAction(uploads: PhotoUpload[]): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    const clean = (Array.isArray(uploads) ? uploads : [])
        .filter((u) => typeof u?.url === "string" && /^https:\/\/res\.cloudinary\.com\//.test(u.url))
        .slice(0, MEDIA_LIMITS.bulkIds)
        .map((u) => ({ url: u.url, width: Number.isFinite(u.width) ? u.width : undefined, height: Number.isFinite(u.height) ? u.height : undefined }));
    if (clean.length === 0) return { ok: false, fieldErrors: {}, formError: { key: "invalidPhoto" } };
    const result = await addPhotos(kennelId, clean);
    if (result.ok) refresh();
    return result;
}

export async function addVideoLinkAction(previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const url = text(formData, "url");
    const title = text(formData, "title");
    const errors: Record<string, { key: string; params?: Record<string, number> }> = {};
    const provider = url ? videoProviderOf(url) : null;
    if (!url) errors.url = { key: "required" };
    else if (!provider) errors.url = { key: "invalidVideoUrl" };
    if (!title) errors.title = { key: "required" };
    else if (title.length > MEDIA_LIMITS.caption) errors.title = { key: "tooLong", params: { max: MEDIA_LIMITS.caption } };
    const tags = resolveTags({ breed: text(formData, "breed"), dogId: text(formData, "dogId") }, await getMediaFilterOptions(kennelId));
    if (!tags.ok) Object.assign(errors, tags.fieldErrors);
    if (Object.keys(errors).length > 0 || !tags.ok || !provider) return failed(previous, errors);
    return fromResult(previous, await addVideoLink(kennelId, { url, provider, title, breed: tags.breed, dogId: tags.dogId }));
}

/** Edit details (photo caption or video title, breed, dog). */
export async function updateMediaAction(id: string, previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const caption = text(formData, "caption");
    if (caption.length > MEDIA_LIMITS.caption) return failed(previous, { caption: { key: "tooLong", params: { max: MEDIA_LIMITS.caption } } });
    const tags = resolveTags({ breed: text(formData, "breed"), dogId: text(formData, "dogId") }, await getMediaFilterOptions(kennelId));
    if (!tags.ok) return failed(previous, tags.fieldErrors);
    return fromResult(previous, await updateMedia(kennelId, id, { caption: caption || null, breed: tags.breed, dogId: tags.dogId }));
}

/** Bulk "Tag breed or dog", bound with the selected ids. */
export async function tagMediaAction(ids: string[], previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    if (!validIds(ids) || ids.length === 0) return failed(previous, {}, { key: "nothingSelected" });
    if (ids.length > MEDIA_LIMITS.bulkIds) return failed(previous, {}, { key: "tooManySelected", params: { max: MEDIA_LIMITS.bulkIds } });
    const tags = resolveTags({ breed: text(formData, "breed"), dogId: text(formData, "dogId") }, await getMediaFilterOptions(kennelId));
    if (!tags.ok) return failed(previous, tags.fieldErrors);
    return fromResult(previous, await tagMedia(kennelId, ids, { breed: tags.breed, dogId: tags.dogId }));
}

export async function deleteMediaAction(ids: string[]): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    if (!validIds(ids) || ids.length === 0) return { ok: false, fieldErrors: {}, formError: { key: "nothingSelected" } };
    if (ids.length > MEDIA_LIMITS.bulkIds) return tooMany();
    const result = await deleteMedia(kennelId, ids);
    if (result.ok) refresh();
    return result;
}

/** Reorder: `toIndex` among all photos (the page has already turned a page index into a global one). */
export async function moveMediaAction(id: string, toIndex: number): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    if (!Number.isInteger(toIndex) || toIndex < 0) return { ok: false, fieldErrors: {}, formError: { key: "invalidChoice" } };
    const result = await moveMedia(kennelId, id, toIndex);
    if (result.ok) refresh();
    return result;
}
