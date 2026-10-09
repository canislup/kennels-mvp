// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Exception: getCurrentKennel below is already REAL. It reads the session
// and Prisma directly, and needs no backend work.)
import { cache } from "react";
import { verifyKennelSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
            owner: { select: { fullName: true } },
        },
    });
    if (!kennel) return null;

    return {
        id: kennel.id,
        name: kennel.name,
        slug: kennel.slug,
        city: kennel.city,
        state: kennel.state,
        logoUrl: kennel.logoUrl,
        ownerName: kennel.owner.fullName,
        ownerInitials: initialsOf(kennel.owner.fullName),
    };
});
