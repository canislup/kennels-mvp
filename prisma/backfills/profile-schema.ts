// Backfill for the Kennel Public Profile schema (KennelBreed, Media, Dog.slug).
//
// This project applies schema changes with `prisma db push` (see CLAUDE.md),
// so data backfills live here as idempotent scripts instead of SQL
// migrations. Safe to re-run: every step only fills in what's missing.
//
//   npx tsx prisma/backfills/profile-schema.ts          # backfill + verify
//   npx tsx prisma/backfills/profile-schema.ts --media  # also seed placeholder Media
import "dotenv/config";
import { PrismaClient, MediaType } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { nextAvailableSlug, slugify } from "@/lib/slug";
import { canonicalBreed } from "@/lib/breeds";


// 1) KennelBreed: each kennel's breeds = Kennel.primaryBreeds ∪ its dogs' breeds,
// matched to Breed rows by name (case-insensitive).
export async function backfillKennelBreeds(prisma: PrismaClient) {
    const breeds = await prisma.breed.findMany({ select: { id: true, name: true } });
    const breedIdByName = new Map(breeds.map((b) => [b.name.toLowerCase(), b.id]));
    const resolve = (name: string) => breedIdByName.get(canonicalBreed(name));

    const kennels = await prisma.kennel.findMany({
        select: { id: true, name: true, primaryBreeds: true, dogs: { select: { breed: true } } },
    });

    const rows: { kennelId: string; breedId: string }[] = [];
    const unmatched: { kennel: string; breed: string }[] = [];
    for (const kennel of kennels) {
        const names = new Set([...kennel.primaryBreeds, ...kennel.dogs.map((d) => d.breed)]);
        for (const name of names) {
            const breedId = resolve(name);
            if (breedId) rows.push({ kennelId: kennel.id, breedId });
            else unmatched.push({ kennel: kennel.name, breed: name });
        }
    }

    const { count } = await prisma.kennelBreed.createMany({ data: rows, skipDuplicates: true });
    return { inserted: count, expected: rows, unmatched };
}

// 2) Dog.slug: slugified name, unique within the kennel. Existing slugs are
// never changed.
export async function backfillDogSlugs(prisma: PrismaClient) {
    const dogs = await prisma.dog.findMany({
        select: { id: true, name: true, kennelId: true, slug: true },
        orderBy: { createdAt: "asc" },
    });

    const takenByKennel = new Map<string, Set<string>>();
    for (const dog of dogs) {
        if (!takenByKennel.has(dog.kennelId)) takenByKennel.set(dog.kennelId, new Set());
        if (dog.slug) takenByKennel.get(dog.kennelId)!.add(dog.slug);
    }

    let updated = 0;
    for (const dog of dogs.filter((d) => !d.slug)) {
        const taken = takenByKennel.get(dog.kennelId)!;
        const slug = nextAvailableSlug(slugify(dog.name), taken);
        taken.add(slug);
        await prisma.dog.update({ where: { id: dog.id }, data: { slug } });
        updated++;
    }
    return { updated };
}

// Verification gate: must report no problems before Dog.slug is made required
// or Kennel.primaryBreeds is dropped.
export async function verifyBackfill(prisma: PrismaClient, expected: { kennelId: string; breedId: string }[]) {
    const problems: string[] = [];

    // Dog.slug is NOT NULL now; this guards against blank values.
    const dogsWithoutSlug = await prisma.dog.count({ where: { slug: "" } });
    if (dogsWithoutSlug > 0) problems.push(`${dogsWithoutSlug} dog(s) still have no slug`);

    const existing = new Set(
        (await prisma.kennelBreed.findMany({ select: { kennelId: true, breedId: true } })).map(
            (r) => `${r.kennelId}:${r.breedId}`,
        ),
    );
    const missing = expected.filter((r) => !existing.has(`${r.kennelId}:${r.breedId}`));
    if (missing.length > 0) problems.push(`${missing.length} expected KennelBreed row(s) missing`);

    return problems;
}

// Placeholder gallery content so the profile UI isn't empty. Skips kennels
// that already have any Media. Dev/demo data only.
const VIDEO_CLIPS = [
    "https://res.cloudinary.com/demo/video/upload/so_0,du_4/dog.mp4",
    "https://res.cloudinary.com/demo/video/upload/so_3,du_4/dog.mp4",
    "https://res.cloudinary.com/demo/video/upload/so_6,du_4/dog.mp4",
];

export async function seedPlaceholderMedia(prisma: PrismaClient) {
    const kennels = await prisma.kennel.findMany({
        where: { media: { none: {} } },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            breeds: { select: { breedId: true }, take: 1 },
            dogs: { select: { id: true, photoUrls: true } },
        },
    });

    let photoId = 500; // offset from the place.dog ids the main seed uses
    let created = 0;
    for (const [index, kennel] of kennels.entries()) {
        const firstBreedId = kennel.breeds[0]?.breedId ?? null;

        const photos = Array.from({ length: 4 }, (_, i) => ({
            kennelId: kennel.id,
            type: MediaType.PHOTO,
            url: `https://place.dog/800/600?id=${photoId++}`,
            // One breed-specific photo per kennel to exercise the breed filter;
            // the rest apply to all of the kennel's breeds (breedId null).
            breedId: i === 0 ? firstBreedId : null,
        }));

        // One dog-specific photo per dog, reusing the dog's existing photo.
        const dogPhotos = kennel.dogs
            .filter((dog) => dog.photoUrls.length > 0)
            .map((dog) => ({ kennelId: kennel.id, dogId: dog.id, type: MediaType.PHOTO, url: dog.photoUrls[0] }));

        const videos = VIDEO_CLIPS.slice(0, index % 2 === 0 ? 3 : 2).map((url) => ({
            kennelId: kennel.id,
            type: MediaType.VIDEO,
            url,
        }));

        const { count } = await prisma.media.createMany({ data: [...photos, ...dogPhotos, ...videos] });
        created += count;
    }
    return { kennels: kennels.length, created };
}

async function main() {
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    try {
        const breeds = await backfillKennelBreeds(prisma);
        console.log(`KennelBreed: inserted ${breeds.inserted} row(s) (${breeds.expected.length} resolved pairs)`);
        for (const u of breeds.unmatched) console.log(`  ⚠ unmatched breed "${u.breed}" on kennel "${u.kennel}" — fix manually`);

        const slugs = await backfillDogSlugs(prisma);
        console.log(`Dog.slug: generated ${slugs.updated} slug(s)`);

        if (process.argv.includes("--media")) {
            const media = await seedPlaceholderMedia(prisma);
            console.log(`Media: created ${media.created} row(s) across ${media.kennels} kennel(s)`);
        }

        const problems = await verifyBackfill(prisma, breeds.expected);
        if (problems.length > 0) {
            console.error("❌ Verification failed:\n  " + problems.join("\n  "));
            process.exitCode = 1;
        } else {
            console.log("✅ Verification passed");
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Run only when executed directly (the seed script imports these functions).
if (process.argv[1]?.includes("profile-schema")) {
    main();
}
