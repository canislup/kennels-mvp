// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only.)
//
// 24 dogs matching Dogs.dc.html: 9 breeding stock, 9 available puppies,
// 4 reserved, 2 sold. Puppies belong to the two born fixture litters.
import type { DogForEdit, DogLifeStage, DogSex, DogStatus, HealthDocument, KennelBreedOption } from "../types";

export type MockDog = DogForEdit & { createdAt: string };

export const KENNEL_BREEDS: KennelBreedOption[] = [
    { id: "brd_labrador", name: "Labrador Retriever" },
    { id: "brd_poodle", name: "Poodle" },
];

const LAB = "Labrador Retriever";
const POODLE = "Poodle";

let photoSeed = 2100; // place.dog ids, offset from the database seeds
const photos = (count: number) => Array.from({ length: count }, () => `https://place.dog/600/450?id=${photoSeed++}`);

type Spec = {
    name: string;
    breed: string;
    sex: DogSex;
    stage: DogLifeStage;
    status: DogStatus;
    birthDate: string;
    litterId?: string;
    photoCount: number;
    registry?: string;
    lineage?: string;
    sireName?: string;
    damName?: string;
    bio?: string;
    docs?: HealthDocument[];
};

const AUTUMN = { litterId: "ltr_autumn", birthDate: "2026-07-02", sireName: "Marley", damName: "Pérola", breed: LAB };
const CLOUD = { litterId: "ltr_poodle", birthDate: "2026-08-10", sireName: "Duque", damName: "Frida", breed: POODLE };

const pup = (litter: typeof AUTUMN, name: string, sex: DogSex, status: DogStatus, photoCount = 3): Spec => ({
    ...litter,
    name,
    sex,
    stage: "PUPPY",
    status,
    photoCount,
    registry: "CBKC",
});

const adult = (name: string, breed: string, sex: DogSex, birthDate: string, extra: Partial<Spec> = {}): Spec => ({
    name,
    breed,
    sex,
    stage: "ADULT",
    status: "BREEDING_STOCK",
    birthDate,
    photoCount: 4,
    registry: "CBKC",
    ...extra,
});

// Listed in the order the design shows them (newest first).
const SPECS: Spec[] = [
    adult("Marley", LAB, "MALE", "2021-05-14", { lineage: "Chocolate Labs BR", sireName: "Rio Claro Bento", damName: "Rio Claro Jade" }),
    adult("Pérola", LAB, "FEMALE", "2022-03-20", { lineage: "Chocolate Labs BR", sireName: "Porto Azul Thor", damName: "Porto Azul Mel" }),
    {
        ...pup(AUTUMN, "Café", "FEMALE", "RESERVED", 5),
        lineage: "Chocolate Labs BR",
        bio: "Café is a calm, curious chocolate girl who greets everyone at the door. She loves water, carries her toys from room to room and has taken to her first training sessions quickly.",
        docs: [
            { id: "doc_cafe_1", url: "https://place.dog/600/800?id=2801", label: "OFA hips and elbows (parents)", fileName: "ofa-pais.jpg" },
            { id: "doc_cafe_2", url: "https://place.dog/600/800?id=2802", label: "DNA panel", fileName: "dna-cafe.jpg" },
            { id: "doc_cafe_3", url: "https://place.dog/600/800?id=2803", label: "Vaccination card", fileName: "vacinas.jpg" },
        ],
    },
    adult("Nala", LAB, "FEMALE", "2024-06-02", { photoCount: 0 }),
    pup(AUTUMN, "Mocha", "MALE", "AVAILABLE_PUPPY"),
    pup(AUTUMN, "Biscoito", "MALE", "AVAILABLE_PUPPY"),
    adult("Frida", POODLE, "FEMALE", "2023-04-11", { lineage: "Standard Poodle EU" }),
    adult("Duque", POODLE, "MALE", "2020-02-27", { lineage: "Standard Poodle EU" }),
    adult("Zeca", LAB, "MALE", "2019-09-03"),
    adult("Amora", LAB, "FEMALE", "2023-01-18", { photoCount: 0 }),
    adult("Luna", POODLE, "FEMALE", "2024-02-09"),
    adult("Theo", POODLE, "MALE", "2022-07-30"),
    pup(AUTUMN, "Paçoca", "FEMALE", "AVAILABLE_PUPPY"),
    pup(AUTUMN, "Fubá", "MALE", "AVAILABLE_PUPPY", 0),
    pup(AUTUMN, "Brownie", "FEMALE", "RESERVED"),
    pup(AUTUMN, "Tostão", "MALE", "RESERVED"),
    pup(AUTUMN, "Canela", "FEMALE", "SOLD"),
    pup(CLOUD, "Floco", "MALE", "AVAILABLE_PUPPY"),
    pup(CLOUD, "Nuvem", "FEMALE", "AVAILABLE_PUPPY"),
    pup(CLOUD, "Algodão", "MALE", "AVAILABLE_PUPPY", 0),
    pup(CLOUD, "Bolinha", "FEMALE", "AVAILABLE_PUPPY"),
    pup(CLOUD, "Pipoca", "FEMALE", "AVAILABLE_PUPPY"),
    pup(CLOUD, "Pérsia", "FEMALE", "RESERVED"),
    pup(CLOUD, "Cookie", "MALE", "SOLD"),
];

const slugOf = (name: string) =>
    name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

export function buildDogFixtures(): MockDog[] {
    const now = Date.now();
    return SPECS.map((spec, i) => ({
        id: `dog_${slugOf(spec.name)}`,
        slug: slugOf(spec.name),
        name: spec.name,
        breed: spec.breed,
        sex: spec.sex,
        lifeStage: spec.stage,
        birthDate: spec.birthDate,
        status: spec.status,
        litterId: spec.litterId ?? null,
        registry: spec.registry ?? null,
        lineage: spec.lineage ?? null,
        pedigreeUrl: null,
        sireName: spec.sireName ?? null,
        damName: spec.damName ?? null,
        bio: spec.bio ?? null,
        photos: photos(spec.photoCount),
        healthDocuments: spec.docs ?? [],
        archivedAt: null,
        // Newest first in the design's order.
        createdAt: new Date(now - (i + 1) * 3_600_000).toISOString(),
    }));
}
