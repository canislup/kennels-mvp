// REAL LOGIC: keep when the backend lands. Not a mock: server-side rules for
// gallery items (video links, captions, breed/dog tags).
import type { FieldError, MediaFilterOptions, VideoProvider } from "../types";

export const MEDIA_LIMITS = { caption: 120, bulkIds: 100 } as const;

/** YouTube (watch, youtu.be, shorts) or Vimeo; anything else is null. */
export function videoProviderOf(raw: string): VideoProvider | null {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return null;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.replace(/^(www\.|m\.)/, "");
    if (host === "youtube.com" && ((url.pathname === "/watch" && url.searchParams.get("v")) || /^\/shorts\/[\w-]+/.test(url.pathname))) return "YOUTUBE";
    if (host === "youtu.be" && /^\/[\w-]+/.test(url.pathname)) return "YOUTUBE";
    if (host === "vimeo.com" && /^\/\d+/.test(url.pathname)) return "VIMEO";
    return null;
}

/**
 * Breed and dog tags. A dog must be this kennel's and a breed one of its
 * breeds; choosing a dog sets the breed from the dog; both set must match.
 */
export function resolveTags(
    input: { breed: string; dogId: string },
    options: MediaFilterOptions,
): { ok: true; breed: string | null; dogId: string | null } | { ok: false; fieldErrors: Record<string, FieldError> } {
    const dog = input.dogId ? options.dogs.find((d) => d.id === input.dogId) : undefined;
    if (input.dogId && !dog) return { ok: false, fieldErrors: { dogId: { key: "invalidChoice" } } };
    if (input.breed && !options.breeds.some((b) => b.name === input.breed)) return { ok: false, fieldErrors: { breed: { key: "invalidBreed" } } };
    if (dog && input.breed && dog.breed !== input.breed) return { ok: false, fieldErrors: { dogId: { key: "dogBreedMismatch" } } };
    return { ok: true, breed: dog ? dog.breed : input.breed || null, dogId: dog?.id ?? null };
}
