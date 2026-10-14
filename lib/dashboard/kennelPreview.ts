// REAL LOGIC (pure, safe in client code): what the Live preview on Settings →
// Kennel profile shows, derived from the form's current (unsaved) values.
// The public page itself is rendered elsewhere; this is a faithful summary.

export type KennelPublicPreview = {
    name: string;
    /** "Curitiba, PR" (either part may be missing). */
    place: string;
    breedNames: string[];
    /** The start of the description, cut at a word boundary. */
    excerpt: string;
    logoUrl: string | null;
    coverUrl: string | null;
};

const EXCERPT_LENGTH = 220;

export function getKennelPublicPreview(input: {
    name: string;
    city: string;
    state: string;
    description: string;
    breedNames: string[];
    logoUrl: string;
    coverUrl: string;
}): KennelPublicPreview {
    const description = input.description.trim().replace(/\s+/g, " ");
    let excerpt = description;
    if (description.length > EXCERPT_LENGTH) {
        const cut = description.slice(0, EXCERPT_LENGTH);
        excerpt = `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : EXCERPT_LENGTH).replace(/[.,;:!?]$/, "")}…`;
    }
    return {
        name: input.name.trim(),
        place: [input.city.trim(), input.state.trim()].filter(Boolean).join(", "),
        breedNames: input.breedNames,
        excerpt,
        logoUrl: input.logoUrl || null,
        coverUrl: input.coverUrl || null,
    };
}
