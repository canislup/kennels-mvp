// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only. Step 3, Litters, expands this.)
import type { LitterStatus } from "../types";

export type MockLitter = {
    id: string;
    name: string;
    breed: string;
    status: LitterStatus;
    damName: string;
    sireName: string;
    bornAt: string | null; // ISO
    expectedGoHomeDate: string | null; // ISO
};

const isoDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12)).toISOString();

export function buildLitterFixtures(): MockLitter[] {
    return [
        {
            id: "ltr_autumn",
            name: "Autumn litter",
            breed: "Labrador Retriever",
            status: "AVAILABLE",
            damName: "Pérola",
            sireName: "Marley",
            bornAt: isoDate(2026, 7, 2),
            expectedGoHomeDate: isoDate(2026, 10, 21),
        },
        {
            id: "ltr_poodle",
            name: "Cloud litter",
            breed: "Poodle",
            status: "AVAILABLE",
            damName: "Frida",
            sireName: "Duque",
            bornAt: isoDate(2026, 8, 10),
            expectedGoHomeDate: isoDate(2026, 11, 2),
        },
        {
            id: "ltr_spring",
            name: "Spring litter",
            breed: "Labrador Retriever",
            status: "PLANNED",
            damName: "Nala",
            sireName: "Marley",
            bornAt: null,
            expectedGoHomeDate: isoDate(2027, 3, 15),
        },
    ];
}
