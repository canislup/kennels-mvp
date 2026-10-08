// Turns arbitrary text into a URL-friendly slug, e.g. "Carioca Frenchies" -> "carioca-frenchies"
export function slugify(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // strip accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// Returns `base`, or `base-2`, `base-3`, ... — the first one not in `taken`.
// Used for dog slugs, which are unique per kennel.
export function nextAvailableSlug(base: string, taken: Set<string>): string {
    const root = base || "dog";
    if (!taken.has(root)) return root;
    let n = 2;
    while (taken.has(`${root}-${n}`)) n++;
    return `${root}-${n}`;
}
