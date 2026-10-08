// Dog.breed and Litter.breed are free text, while kennel breeds are Breed rows
// (via KennelBreed). These helpers match the two.

// Free-text names that map to a Breed row under a different name.
export const BREED_ALIASES: Record<string, string> = {
    doberman: "Doberman Pinscher",
    "spitz alemão": "Pomeranian",
    schnauzer: "Miniature Schnauzer",
};

// Canonical lowercase breed name for comparison.
export function canonicalBreed(name: string): string {
    const key = name.trim().toLowerCase();
    return (BREED_ALIASES[key] ?? key).toLowerCase();
}

export function isSameBreed(freeText: string, breedName: string): boolean {
    return canonicalBreed(freeText) === canonicalBreed(breedName);
}
