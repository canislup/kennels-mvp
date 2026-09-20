// Turns arbitrary text into a URL-friendly slug, e.g. "Carioca Frenchies" -> "carioca-frenchies"
export function slugify(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // strip accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}
