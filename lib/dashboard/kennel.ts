// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Exception: getCurrentKennel below is already REAL. It reads the session
// and Prisma directly. Temporary mock parts: it applies the owner name saved
// on Settings → Account and the name, slug, city, state and logo saved on
// Settings → Kennel profile (mock store) until those writes reach Prisma;
// then delete the override lines.)
import { cache } from "react";
import { verifyKennelSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMockStore } from "./mock/store";
import { savedShellOverrides } from "./kennelProfile";
import type { CurrentKennel } from "./types";

function initialsOf(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
    return letters.map((part) => part[0]!.toUpperCase()).join("") || "?";
}

/**
 * The signed-in owner's kennel, or null when there is no session or the owner
 * hasn't created a kennel yet. cache() dedupes it across the layout and page
 * within one request.
 */
export const getCurrentKennel = cache(async (): Promise<CurrentKennel | null> => {
    const session = await verifyKennelSession();
    if (!session) return null;

    const kennel = await prisma.kennel.findUnique({
        where: { ownerId: session.userID as string },
        select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            logoUrl: true,
            ownerId: true,
            owner: { select: { fullName: true } },
        },
    });
    if (!kennel) return null;

    // TEMPORARY (mock): the name saved on Settings → Account.
    const ownerName = getMockStore().accountOverrides[kennel.ownerId]?.fullName ?? kennel.owner.fullName;
    // TEMPORARY (mock): the profile saved on Settings → Kennel profile.
    const profile = savedShellOverrides(kennel.id) ?? kennel;

    return {
        id: kennel.id,
        ownerId: kennel.ownerId,
        name: profile.name,
        slug: profile.slug,
        city: profile.city,
        state: profile.state,
        logoUrl: profile.logoUrl,
        ownerName,
        ownerInitials: initialsOf(ownerName),
    };
});
