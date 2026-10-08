// TODO: replace with a Review model. Until then the profile shows these
// static placeholders (adapted from the Profile.html design, with the
// mockup's kennel/dog names removed so they read as breed-neutral) and a
// fixed rating — nothing here is computed from real buyer feedback.
// Review text is treated like user-generated content: not translated.

export const PLACEHOLDER_RATING = { value: 4.8, count: 112 };

export const PLACEHOLDER_REVIEWS = [
    {
        author: "Jamie R.",
        month: "2026-09",
        stars: 5,
        text: "Our puppy has been the easiest, healthiest addition to our family. The kennel kept us updated the whole way and answered every question.",
    },
    {
        author: "Marcus T.",
        month: "2026-07",
        stars: 5,
        text: "Two puppies from this kennel now, both beautifully tempered and sound. Worth the wait every time.",
    },
    {
        author: "Priya S.",
        month: "2026-06",
        stars: 4,
        text: "Communication could've been a bit faster during the wait, but the puppy itself has been wonderful.",
    },
];
