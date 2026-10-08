// Backfill + demo data for the Kennel Public Profile and dog detail pages:
// Dog.lifeStage / birthDate / registry / bio / sireName / damName,
// Litter.name / bornAt / availableCount / dam / sire, per-dog gallery photos,
// and a multi-breed demo kennel (Maré Labs + Poodle).
//
// Idempotent: fields are only filled where null, and the demo is skipped if
// it already exists. Dog/litter details are only seeded for the kennels
// created by prisma/seed.ts, never for real user-created kennels.
//
//   npx tsx prisma/backfills/profile-details.ts
import "dotenv/config";
import { PrismaClient, DogLifeStage, DogStatus, LitterStatus, MediaType } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugify } from "@/lib/slug";
import { isSameBreed } from "@/lib/breeds";

export const SEEDED_KENNEL_SLUGS = [
    "Carioca Frenchies",
    "Guardiões de Minas",
    "Pampa Roots",
    "Cerrado Poms",
    "Agility Brasil",
    "Pequenos Nobres",
    "Capital Dobes",
    "Maré Labs",
    "Sertãozinho Kennel",
    "Royal Goldens SC",
].map(slugify);

const DAY = 24 * 60 * 60 * 1000;
const PLACE_DOG = (id: number, w = 800, h = 600) => `https://place.dog/${w}/${h}?id=${id}`;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

// 1) lifeStage from the existing sales status (one-off; all dogs).
export async function backfillLifeStage(prisma: PrismaClient) {
    const { count } = await prisma.dog.updateMany({
        where: { status: { in: [DogStatus.AVAILABLE_PUPPY, DogStatus.RESERVED, DogStatus.SOLD] }, lifeStage: DogLifeStage.ADULT },
        data: { lifeStage: DogLifeStage.PUPPY },
    });
    return { puppies: count };
}

// 2) Litter + dog details for seeded kennels, only where currently null.
export async function seedProfileDetails(prisma: PrismaClient) {
    const kennels = await prisma.kennel.findMany({
        where: { slug: { in: SEEDED_KENNEL_SLUGS } },
        select: {
            name: true,
            dogs: { select: { id: true, breed: true, gender: true, lifeStage: true, birthDate: true, registry: true } },
            litters: {
                select: { id: true, breed: true, status: true, puppyCount: true, expectedGoHomeDate: true, name: true, bornAt: true, availableCount: true, damId: true, sireId: true },
            },
        },
    });

    let litters = 0;
    let dogs = 0;
    for (const kennel of kennels) {
        const prefix = kennel.name.split(" ")[0];
        const adults = kennel.dogs.filter((d) => d.lifeStage === DogLifeStage.ADULT);

        for (const litter of kennel.litters) {
            const born = litter.status !== LitterStatus.PLANNED;
            const goHome = litter.expectedGoHomeDate ?? daysAgo(-30);
            const sameBreed = adults.filter((d) => isSameBreed(d.breed, litter.breed));
            const dam = sameBreed.find((d) => d.gender.toLowerCase() === "female");
            const sire = sameBreed.find((d) => d.gender.toLowerCase() === "male");

            await prisma.litter.update({
                where: { id: litter.id },
                data: {
                    name: litter.name ?? `${prefix} litter`,
                    bornAt: litter.bornAt ?? (born ? new Date(goHome.getTime() - 56 * DAY) : null),
                    availableCount:
                        litter.availableCount ??
                        (litter.status === LitterStatus.AVAILABLE ? Math.max(1, Math.floor(litter.puppyCount / 2)) : born ? 0 : null),
                    damId: litter.damId ?? dam?.id ?? null,
                    sireId: litter.sireId ?? sire?.id ?? null,
                },
            });
            litters++;
        }

        for (const [i, dog] of kennel.dogs.entries()) {
            const puppyLitter = kennel.litters.find((l) => isSameBreed(l.breed, dog.breed) && l.status !== LitterStatus.PLANNED);
            const fallbackPuppyBirth = puppyLitter?.expectedGoHomeDate
                ? new Date(puppyLitter.expectedGoHomeDate.getTime() - 56 * DAY)
                : daysAgo(63);
            await prisma.dog.update({
                where: { id: dog.id },
                data: {
                    // Adults 2–6 years old, deterministic per dog position.
                    birthDate:
                        dog.birthDate ??
                        (dog.lifeStage === DogLifeStage.PUPPY ? fallbackPuppyBirth : daysAgo(365 * (2 + (i % 5)) + 40 * (i + 1))),
                    // Seeded kennels are Brazilian → CBKC.
                    registry: dog.registry ?? "CBKC",
                },
            });
            dogs++;
        }
    }
    return { litters, dogs };
}

// 3) Dog detail page content for seeded kennels: bio, parents' registered
// names, and a 4-photo gallery. Only fills what's missing.
const EXTERNAL_SIRES = ["Vale do Sol Imperador", "Serra Azul Barão", "Recanto Real Atlas", "Monte Verde Faraó", "Solar dos Ventos Duque"];
const EXTERNAL_DAMS = ["Vale do Sol Aurora", "Serra Azul Bela", "Recanto Real Íris", "Monte Verde Jade", "Solar dos Ventos Luna"];
const GALLERY_SIZE = 4;

function seedBio(dog: { name: string; breed: string; gender: string; lifeStage: DogLifeStage }, kennelName: string) {
    if (dog.lifeStage === DogLifeStage.PUPPY) {
        return `${dog.name} is a ${dog.breed} puppy raised in the home at ${kennelName}, well socialized with people, sounds, and everyday household life.`;
    }
    return dog.gender.toLowerCase() === "female"
        ? `${dog.name} is one of ${kennelName}'s ${dog.breed} dams, valued for her steady temperament and strong maternal instincts. She is fully health-tested before every breeding.`
        : `${dog.name} is a ${dog.breed} sire at ${kennelName}, chosen for his sound structure and confident, even temperament. He is fully health-tested before every breeding.`;
}

export async function seedDogDetails(prisma: PrismaClient) {
    const kennels = await prisma.kennel.findMany({
        where: { slug: { in: SEEDED_KENNEL_SLUGS } },
        select: {
            id: true,
            name: true,
            dogs: {
                orderBy: { createdAt: "asc" },
                select: { id: true, name: true, breed: true, gender: true, lifeStage: true, bio: true, sireName: true, damName: true, _count: { select: { media: true } } },
            },
            litters: {
                where: { status: { not: LitterStatus.PLANNED } },
                select: { breed: true, dam: { select: { name: true } }, sire: { select: { name: true } } },
            },
        },
    });

    let dogs = 0;
    let photos = 0;
    let photoId = 900; // offset from the place.dog ids used by the other seeds
    for (const kennel of kennels) {
        for (const [i, dog] of kennel.dogs.entries()) {
            // Puppies take their parents from their breed's litter; adults
            // come from (fictional) outside kennels.
            const litter = dog.lifeStage === DogLifeStage.PUPPY ? kennel.litters.find((l) => isSameBreed(l.breed, dog.breed)) : undefined;
            await prisma.dog.update({
                where: { id: dog.id },
                data: {
                    bio: dog.bio ?? seedBio(dog, kennel.name),
                    sireName: dog.sireName ?? litter?.sire?.name ?? EXTERNAL_SIRES[(i + kennel.name.length) % EXTERNAL_SIRES.length],
                    damName: dog.damName ?? litter?.dam?.name ?? EXTERNAL_DAMS[(i + kennel.name.length + 2) % EXTERNAL_DAMS.length],
                },
            });
            dogs++;

            const missing = GALLERY_SIZE - dog._count.media;
            if (missing > 0) {
                const { count } = await prisma.media.createMany({
                    data: Array.from({ length: missing }, () => ({
                        kennelId: kennel.id,
                        dogId: dog.id,
                        type: MediaType.PHOTO,
                        url: PLACE_DOG(photoId++),
                    })),
                });
                photos += count;
            } else {
                photoId += GALLERY_SIZE;
            }
        }
    }
    return { dogs, photos };
}

// 4) Multi-breed demo: Maré Labs also raises Poodles, mirroring
// Profile-MultiBreed.html (Labrador Retriever + Standard Poodle).
const DEMO_VIDEOS = [
    "https://res.cloudinary.com/demo/video/upload/so_9,du_4/dog.mp4",
    "https://res.cloudinary.com/demo/video/upload/so_1,du_4/dog.mp4",
];

export async function seedMultiBreedDemo(prisma: PrismaClient) {
    const kennel = await prisma.kennel.findUnique({
        where: { slug: slugify("Maré Labs") },
        select: { id: true, breeds: { select: { breed: { select: { id: true, name: true } } } } },
    });
    if (!kennel) return { skipped: "Maré Labs not found" };

    const poodle = await prisma.breed.findUniqueOrThrow({ where: { name: "Poodle" }, select: { id: true } });
    if (kennel.breeds.some((b) => b.breed.id === poodle.id)) return { skipped: "already multi-breed" };
    const labrador = kennel.breeds.find((b) => b.breed.name === "Labrador Retriever")?.breed;

    await prisma.$transaction(async (tx) => {
        await tx.kennelBreed.create({ data: { kennelId: kennel.id, breedId: poodle.id } });

        const sire = await tx.dog.create({
            data: { kennelId: kennel.id, name: "Bento", slug: "bento", breed: "Poodle", gender: "Male", status: DogStatus.BREEDING_STOCK, lifeStage: DogLifeStage.ADULT, birthDate: daysAgo(365 * 5 + 20), registry: "CBKC", photoUrls: [PLACE_DOG(701, 500, 400)] },
        });
        const dam = await tx.dog.create({
            data: { kennelId: kennel.id, name: "Pérola", slug: "perola", breed: "Poodle", gender: "Female", status: DogStatus.BREEDING_STOCK, lifeStage: DogLifeStage.ADULT, birthDate: daysAgo(365 * 4 + 90), registry: "CBKC", photoUrls: [PLACE_DOG(702, 500, 400)] },
        });
        await tx.dog.create({
            data: { kennelId: kennel.id, name: "Café", slug: "cafe", breed: "Poodle", gender: "Male", status: DogStatus.AVAILABLE_PUPPY, lifeStage: DogLifeStage.PUPPY, birthDate: daysAgo(60), registry: "CBKC", photoUrls: [PLACE_DOG(703, 500, 400)] },
        });

        await tx.litter.create({
            data: { kennelId: kennel.id, breed: "Poodle", name: "Maré Poodle litter", status: LitterStatus.AVAILABLE, puppyCount: 5, availableCount: 2, bornAt: daysAgo(60), expectedGoHomeDate: daysAgo(-10), damId: dam.id, sireId: sire.id },
        });

        // Breed-specific gallery content for the Poodle tab...
        await tx.media.createMany({
            data: [
                ...[704, 705, 706].map((id) => ({ kennelId: kennel.id, breedId: poodle.id, type: MediaType.PHOTO, url: PLACE_DOG(id) })),
                ...DEMO_VIDEOS.map((url) => ({ kennelId: kennel.id, breedId: poodle.id, type: MediaType.VIDEO, url })),
            ],
        });
        // ...and tag the kennel's untagged photos as Labrador, so the two tabs differ.
        if (labrador) {
            await tx.media.updateMany({
                where: { kennelId: kennel.id, breedId: null, dogId: null, type: MediaType.PHOTO },
                data: { breedId: labrador.id },
            });
        }
    });
    return { created: "Maré Labs + Poodle" };
}

async function main() {
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    try {
        console.log("lifeStage:", await backfillLifeStage(prisma));
        console.log("details:", await seedProfileDetails(prisma));
        console.log("multi-breed demo:", await seedMultiBreedDemo(prisma));
        console.log("dog details:", await seedDogDetails(prisma));
    } finally {
        await prisma.$disconnect();
    }
}

if (process.argv[1]?.includes("profile-details")) {
    main();
}
