// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only.)
//
// The kennel gallery from Media.dc.html: 30 photos (two pages at 24) and 3
// video links. Separate from each dog's own photos (mock/dogs.ts) for now;
// see ENDPOINTS.md for the recommendation to unify them. Video thumbnails
// are null so the demo makes no requests to YouTube or Vimeo.
import type { MediaKind, VideoProvider } from "../types";

export type MockMedia = {
    id: string;
    type: MediaKind;
    url: string | null;
    caption: string | null;
    breed: string | null; // Breed name (the real column is breedId)
    dogId: string | null;
    position: number;
    createdAt: string;
    provider: VideoProvider | null;
    thumbnailUrl: string | null;
};

const LAB = "Labrador Retriever";
const POODLE = "Poodle";

// [caption, breed, dogId] — breed comes from the dog when tagged with one.
const PHOTOS: [string, string | null, string | null][] = [
    ["Marley at the beach", LAB, "dog_marley"],
    ["Pérola with the puppies", LAB, "dog_perola"],
    ["Café, week 8", LAB, "dog_cafe"],
    ["Nala in the garden", LAB, "dog_nala"],
    ["Frida after grooming", POODLE, "dog_frida"],
    ["Mocha playing", LAB, "dog_mocha"],
    ["Autumn litter, day 1", LAB, null],
    ["Duque portrait", POODLE, "dog_duque"],
    ["Our yard", null, null],
    ["Tostão and Biscoito", LAB, "dog_biscoito"],
    ["Pipoca, week 6", POODLE, "dog_pipoca"],
    ["Canela napping", LAB, "dog_canela"],
    ["Morning walk", null, null],
    ["Zeca by the lake", LAB, "dog_zeca"],
    ["Amora in the snow", LAB, "dog_amora"],
    ["Luna's first show", POODLE, "dog_luna"],
    ["Theo, freshly clipped", POODLE, "dog_theo"],
    ["Puppy room", null, null],
    ["Autumn litter, week 3", LAB, null],
    ["Fubá and Paçoca", LAB, "dog_pacoca"],
    ["Brownie's first bath", LAB, "dog_brownie"],
    ["Poodles in the garden", POODLE, null],
    ["Floco and Nuvem", POODLE, "dog_floco"],
    ["Bolinha at 8 weeks", POODLE, "dog_bolinha"],
    ["Family visit day", null, null],
    ["Marley and Pérola", LAB, "dog_marley"],
    ["Agility practice", LAB, null],
    ["Algodão sleeping", POODLE, "dog_algodao"],
    ["Winter litter, day 2", LAB, null],
    ["The kennel at sunset", null, null],
];

const VIDEOS: { caption: string; url: string; provider: VideoProvider; breed: string | null }[] = [
    { caption: "Meet the Autumn litter", url: "https://www.youtube.com/watch?v=Xk3Lm9Qp2Aw", provider: "YOUTUBE", breed: null },
    // The design's "Uploaded" example: video upload is out of scope, so it's a link here.
    { caption: "A day at the kennel", url: "https://vimeo.com/824512345", provider: "VIMEO", breed: LAB },
    { caption: "Frida and Duque, grooming day", url: "https://youtu.be/Pq7Rz2Lm8Nd", provider: "YOUTUBE", breed: POODLE },
];

export function buildMediaFixtures(): MockMedia[] {
    const now = Date.now();
    const photos = PHOTOS.map(([caption, breed, dogId], i): MockMedia => ({
        id: `media_photo_${i + 1}`,
        type: "PHOTO",
        // Two without a file, to show the gradient fallback.
        url: i === 8 || i === 24 ? null : `https://place.dog/800/600?id=${3100 + i}`,
        caption,
        breed,
        dogId,
        position: i,
        createdAt: new Date(now - (PHOTOS.length - i) * 86_400_000).toISOString(),
        provider: null,
        thumbnailUrl: null,
    }));
    const videos = VIDEOS.map((video, i): MockMedia => ({
        id: `media_video_${i + 1}`,
        type: "VIDEO",
        url: video.url,
        caption: video.caption,
        breed: video.breed,
        dogId: null,
        position: i,
        createdAt: new Date(now - (10 - i) * 86_400_000).toISOString(),
        provider: video.provider,
        thumbnailUrl: null,
    }));
    return [...photos, ...videos];
}
