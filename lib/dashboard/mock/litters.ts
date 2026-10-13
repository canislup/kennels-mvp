// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only.)
//
// Four litters, one per status, so every Litters tab has content. Puppies are
// linked from mock/dogs.ts (Dog.litterId); all counts on the Litters screen
// are computed from those links, never stored here.
import type { DateOnlyString, LitterStatus } from "../types";

export type MockLitter = {
    id: string;
    name: string;
    breed: string;
    status: LitterStatus;
    damId: string | null;
    sireId: string | null;
    birthDate: DateOnlyString | null;
    expectedGoHomeDate: DateOnlyString | null;
    puppyCount: number;
    createdAt: string; // ISO
};

export type MockWaitlistEntry = {
    id: string;
    litterId: string;
    leadId: string; // → Lead (mock/leads.ts); the name comes from the lead
    position: number;
    note: string | null;
    createdAt: string; // ISO
};

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

export function buildLitterFixtures(): MockLitter[] {
    return [
        {
            id: "ltr_autumn",
            name: "Autumn litter",
            breed: "Labrador Retriever",
            status: "AVAILABLE",
            damId: "dog_perola",
            sireId: "dog_marley",
            birthDate: "2026-07-02",
            expectedGoHomeDate: "2026-10-21",
            puppyCount: 6,
            createdAt: ago(2),
        },
        {
            id: "ltr_winter",
            name: "Winter litter",
            breed: "Labrador Retriever",
            status: "RESERVED",
            damId: "dog_amora",
            sireId: "dog_zeca",
            birthDate: "2026-08-05",
            expectedGoHomeDate: "2026-11-02",
            puppyCount: 5,
            createdAt: ago(20),
        },
        {
            id: "ltr_spring",
            name: "Spring litter",
            breed: "Labrador Retriever",
            status: "PLANNED",
            damId: "dog_nala",
            sireId: "dog_marley",
            birthDate: null,
            expectedGoHomeDate: "2027-02-15",
            puppyCount: 0,
            createdAt: ago(5),
        },
        {
            id: "ltr_summer",
            name: "Summer litter",
            breed: "Poodle",
            status: "SOLD_OUT",
            damId: "dog_frida",
            sireId: "dog_duque",
            birthDate: "2026-06-01",
            expectedGoHomeDate: "2026-08-03",
            puppyCount: 4,
            createdAt: ago(120),
        },
    ];
}

export function buildWaitlistFixtures(): MockWaitlistEntry[] {
    return [
        { id: "wl_1", litterId: "ltr_autumn", leadId: "lead-ricardo-alves", position: 1, note: "Wants a male, any colour.", createdAt: ago(0.01) },
        { id: "wl_2", litterId: "ltr_autumn", leadId: "lead-marina-costa", position: 2, note: "Prefers a chocolate female. Deposit not yet paid.", createdAt: ago(2) },
        { id: "wl_3", litterId: "ltr_autumn", leadId: "lead-camila-torres", position: 3, note: "Asked about Mocha.", createdAt: ago(3) },
    ];
}
