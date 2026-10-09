// Demo batch 2: 10 additional kennels with owners, dogs, litters and media.
//
// ADDITIVE ONLY — this script never deletes or updates existing rows. Each
// kennel is skipped if its owner email or kennel slug already exists, so it
// is safe to re-run. Not wired into `prisma db seed` (that runs the
// destructive prisma/seed.ts).
//
//   npx tsx scripts/seed-demo-batch-2.ts
//
// Every account's password is DEMO_PASSWORD, hashed with bcrypt exactly as
// /api/auth/register does, so these owners can log in to the dashboard.
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, DogStatus, LitterStatus, MediaType, type Prisma } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugify, nextAvailableSlug } from "@/lib/slug";
import { lifeStageFromStatus } from "@/lib/dog-life-stage";

export const DEMO_PASSWORD = "Demo1234!";
const BCRYPT_ROUNDS = 10; // same as app/api/auth/register/route.ts

type Gender = "Male" | "Female";
type Adult = { name: string; lineage: string; registry?: "AKC"; pedigree?: boolean };
type BreedLine = { breed: string; sire: Adult; dam: Adult };
type Pup = [name: string, gender: Gender];
type KennelSpec = {
    owner: { fullName: string; email: string; phoneNumber: string };
    name: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
    isVerified: boolean;
    prestigeScore: number;
    description: string;
    // lines[0] is the primary breed and backs litter A (always AVAILABLE).
    lines: BreedLine[];
    // A single extra adult (e.g. a third breed being started, or a young prospect).
    extraAdult?: Adult & { breed: string; gender: Gender };
    litterA: { name: string; ageDays: number; puppyCount: number; availableCount: number };
    // Litter B: an older SOLD_OUT litter, a RESERVED litter, or a PLANNED one.
    litterB: { name: string; status: "PLANNED" | "RESERVED" | "SOLD_OUT"; line: number };
    // Named puppies. The reserved / sold pup belongs to litter B when B's
    // status matches, otherwise to litter A.
    puppies: { available: Pup[]; reserved: Pup; sold: Pup };
};

// Breed strings MUST be byte-identical to Breed.name (checked at runtime).
const KENNELS: KennelSpec[] = [
    {
        owner: { fullName: "Ana Paula Kowalski", email: "ana.kowalski@demo.kennelos.test", phoneNumber: "41998761201" },
        name: "Lobos do Sul",
        city: "Curitiba",
        state: "PR",
        latitude: -25.4284,
        longitude: -49.2733,
        isVerified: true,
        prestigeScore: 82,
        description:
            "Lobos do Sul raises Nordic breeds in the cool highlands outside Curitiba, where the climate suits a double coat. We started with Siberian Huskies in 2014 and have since added Alaskan Malamutes and a small Samoyed program. Our dogs run on a training rig three mornings a week, every breeding pair is hip-scored and eye-checked, and puppies are raised indoors with early neurological stimulation before moving to our outdoor play yards.",
        lines: [
            {
                breed: "Siberian Husky",
                sire: { name: "Yukon", lineage: "US import, show line", registry: "AKC", pedigree: true },
                dam: { name: "Tundra", lineage: "Brazilian working line" },
            },
            {
                breed: "Alaskan Malamute",
                sire: { name: "Kenai", lineage: "Heavy freighting line" },
                dam: { name: "Denali", lineage: "Kotzebue-type line" },
            },
        ],
        extraAdult: { breed: "Samoyed", gender: "Female", name: "Neve", lineage: "European show line" },
        litterA: { name: "Aurora litter", ageDays: 47, puppyCount: 6, availableCount: 2 },
        litterB: { name: "Blizzard litter", status: "RESERVED", line: 1 },
        puppies: { available: [["Ártico", "Male"]], reserved: ["Ventania", "Female"], sold: ["Granizo", "Male"] },
    },
    {
        owner: { fullName: "Rodrigo Hoffmann", email: "rodrigo.hoffmann@demo.kennelos.test", phoneNumber: "54998761202" },
        name: "Neve Tropical",
        city: "Gramado",
        state: "RS",
        latitude: -29.3746,
        longitude: -50.8764,
        isVerified: false,
        prestigeScore: 58,
        description:
            "Neve Tropical is a small, family-run Siberian Husky kennel in the Serra Gaúcha. We breed one or two litters a year from our own dogs, focusing on even temperaments that fit family life as well as long winter hikes. Puppies grow up in our home with children, cats and plenty of visitors, and every family gets lifetime support from us, from crate training to the first summer shed.",
        lines: [
            {
                breed: "Siberian Husky",
                sire: { name: "Koda", lineage: "Brazilian show line" },
                dam: { name: "Sitka", lineage: "Brazilian show line" },
            },
        ],
        extraAdult: { breed: "Siberian Husky", gender: "Female", name: "Juneau", lineage: "Brazilian show line" },
        litterA: { name: "Inverno litter", ageDays: 52, puppyCount: 5, availableCount: 2 },
        litterB: { name: "Outono litter", status: "SOLD_OUT", line: 0 },
        puppies: { available: [["Pinhão", "Male"], ["Geada", "Female"]], reserved: ["Serração", "Female"], sold: ["Minuano", "Male"] },
    },
    {
        owner: { fullName: "Helena Bastos", email: "helena.bastos@demo.kennelos.test", phoneNumber: "12998761203" },
        name: "Matilha Serrana",
        city: "Campos do Jordão",
        state: "SP",
        latitude: -22.7394,
        longitude: -45.5914,
        isVerified: true,
        prestigeScore: 71,
        description:
            "Matilha Serrana breeds Siberian Huskies and Golden Retrievers in the mountains of Campos do Jordão. Both breeds share our property and are raised together, so our puppies are used to dogs of every size and energy level. We health-test every parent before breeding, keep litters small, and match each puppy to its family based on temperament testing at seven weeks.",
        lines: [
            {
                breed: "Siberian Husky",
                sire: { name: "Kobuk", lineage: "Brazilian working line" },
                dam: { name: "Kiska", lineage: "Brazilian working line" },
            },
            {
                breed: "Golden Retriever",
                sire: { name: "Trigo", lineage: "English-type field line" },
                dam: { name: "Canela", lineage: "English-type show line" },
            },
        ],
        litterA: { name: "Primavera litter", ageDays: 40, puppyCount: 5, availableCount: 2 },
        litterB: { name: "Verão litter", status: "PLANNED", line: 1 },
        puppies: { available: [["Fubá", "Female"]], reserved: ["Pipoca", "Male"], sold: ["Paçoca", "Female"] },
    },
    {
        owner: { fullName: "Marcelo Andrade", email: "marcelo.andrade@demo.kennelos.test", phoneNumber: "19998761204" },
        name: "Casa Dourada Retrievers",
        city: "Campinas",
        state: "SP",
        latitude: -22.9056,
        longitude: -47.0608,
        isVerified: true,
        prestigeScore: 90,
        description:
            "Casa Dourada Retrievers has raised Golden and Labrador Retrievers in Campinas for over fifteen years, and recently began a Poodle program for families who need a low-shedding companion. Our breeding dogs come from proven show and field lines, several of them imported, and all are OFA hip and elbow certified. Puppies are raised in our home nursery and go home vaccinated, microchipped and already started on house training.",
        lines: [
            {
                breed: "Golden Retriever",
                sire: { name: "Dourado", lineage: "English show line" },
                dam: { name: "Âmbar", lineage: "US import, field line", registry: "AKC", pedigree: true },
            },
            {
                breed: "Labrador Retriever",
                sire: { name: "Cacau", lineage: "English show line" },
                dam: { name: "Bruma", lineage: "American field line" },
            },
        ],
        extraAdult: { breed: "Poodle", gender: "Female", name: "Florença", lineage: "Standard Poodle, European line" },
        litterA: { name: "Sunrise litter", ageDays: 58, puppyCount: 7, availableCount: 3 },
        litterB: { name: "Cocoa litter", status: "SOLD_OUT", line: 1 },
        puppies: { available: [["Girassol", "Female"]], reserved: ["Caramelo", "Male"], sold: ["Biscoito", "Male"] },
    },
    {
        owner: { fullName: "Fábio Rezende", email: "fabio.rezende@demo.kennelos.test", phoneNumber: "31998761205" },
        name: "Guarda Imperial",
        city: "Belo Horizonte",
        state: "MG",
        latitude: -19.9167,
        longitude: -43.9345,
        isVerified: false,
        prestigeScore: 64,
        description:
            "Guarda Imperial breeds Doberman Pinschers and Rottweilers for families who want a confident, trainable guardian. Our dogs are temperament-tested and trained in obedience from an early age, and we only breed dogs that are stable around children and strangers. We are happy to talk new owners through socialization, training and the commitment these breeds need before they reserve a puppy.",
        lines: [
            {
                breed: "Doberman Pinscher",
                sire: { name: "Kaiser", lineage: "European working line", pedigree: true },
                dam: { name: "Valquíria", lineage: "European working line" },
            },
            {
                breed: "Rottweiler",
                sire: { name: "Golias", lineage: "German import line" },
                dam: { name: "Onça", lineage: "Brazilian show line" },
            },
        ],
        litterA: { name: "Imperial litter", ageDays: 44, puppyCount: 6, availableCount: 3 },
        litterB: { name: "Guardiã litter", status: "RESERVED", line: 1 },
        puppies: { available: [["Sargento", "Male"]], reserved: ["Capitã", "Female"], sold: ["Major", "Male"] },
    },
    {
        owner: { fullName: "Simone Vieira", email: "simone.vieira@demo.kennelos.test", phoneNumber: "62998761206" },
        name: "Pastores do Planalto",
        city: "Goiânia",
        state: "GO",
        latitude: -16.6869,
        longitude: -49.2648,
        isVerified: true,
        prestigeScore: 77,
        description:
            "Pastores do Planalto is a German Shepherd Dog kennel near Goiânia focused on working-line dogs with steady nerves and correct structure. Our adults train in tracking and obedience, and several have earned working titles. We breed for health first, with hip and elbow scoring and DNA testing on every parent, and we place puppies with active families, sport homes and working handlers.",
        lines: [
            {
                breed: "German Shepherd Dog",
                sire: { name: "Falcão", lineage: "German working line", pedigree: true },
                dam: { name: "Dakota", lineage: "Czech working line" },
            },
        ],
        extraAdult: { breed: "German Shepherd Dog", gender: "Male", name: "Argos", lineage: "German working line" },
        litterA: { name: "Planalto litter", ageDays: 38, puppyCount: 7, availableCount: 3 },
        litterB: { name: "Savana litter", status: "PLANNED", line: 0 },
        puppies: { available: [["Ipê", "Female"], ["Buriti", "Male"]], reserved: ["Pequi", "Female"], sold: ["Jatobá", "Male"] },
    },
    {
        owner: { fullName: "Diego Cavalcanti", email: "diego.cavalcanti@demo.kennelos.test", phoneNumber: "81998761207" },
        name: "Recife Labs",
        city: "Recife",
        state: "PE",
        latitude: -8.0476,
        longitude: -34.877,
        isVerified: false,
        prestigeScore: 45,
        description:
            "Recife Labs is a home kennel breeding Labrador Retrievers for families in the Northeast. We keep a single breeding pair and raise every litter in our living room, so the puppies are used to everyday household noise long before they go home. Each puppy leaves with a vet check, first vaccinations and a care guide written for the region's heat and humidity.",
        lines: [
            {
                breed: "Labrador Retriever",
                sire: { name: "Maracatu", lineage: "English show line", pedigree: true },
                dam: { name: "Ciranda", lineage: "English show line" },
            },
        ],
        litterA: { name: "Mangue litter", ageDays: 63, puppyCount: 6, availableCount: 2 },
        litterB: { name: "Carnaval litter", status: "SOLD_OUT", line: 0 },
        puppies: { available: [["Frevo", "Male"], ["Baião", "Female"]], reserved: ["Xaxado", "Male"], sold: ["Coco", "Female"] },
    },
    {
        owner: { fullName: "Larissa Schmitt", email: "larissa.schmitt@demo.kennelos.test", phoneNumber: "48998761208" },
        name: "Ilha Bulldogs",
        city: "Florianópolis",
        state: "SC",
        latitude: -27.5954,
        longitude: -48.548,
        isVerified: true,
        prestigeScore: 69,
        description:
            "Ilha Bulldogs breeds French Bulldogs and Pugs on the island of Florianópolis, with a strong focus on breathing and structural health. We select parents with open nostrils and moderate builds, and every breeding dog is evaluated by a veterinarian for airway function before it joins the program. Our puppies are raised in an air-conditioned nursery and go home only to families who understand brachycephalic care.",
        lines: [
            {
                breed: "French Bulldog",
                sire: { name: "Bolota", lineage: "European show line", pedigree: true },
                dam: { name: "Pipa", lineage: "Brazilian show line" },
            },
            {
                breed: "Pug",
                sire: { name: "Tico", lineage: "Brazilian show line" },
                dam: { name: "Teca", lineage: "Brazilian show line" },
            },
        ],
        litterA: { name: "Maré Alta litter", ageDays: 50, puppyCount: 4, availableCount: 1 },
        litterB: { name: "Lagoa litter", status: "SOLD_OUT", line: 1 },
        puppies: { available: [["Chiclete", "Female"]], reserved: ["Pudim", "Male"], sold: ["Brigadeiro", "Male"] },
    },
    {
        owner: { fullName: "Gustavo Prado", email: "gustavo.prado@demo.kennelos.test", phoneNumber: "16998761209" },
        name: "Bosque Border",
        city: "Ribeirão Preto",
        state: "SP",
        latitude: -21.1775,
        longitude: -47.8103,
        isVerified: false,
        prestigeScore: 22,
        description:
            "Bosque Border is a new Border Collie kennel on a small farm outside Ribeirão Preto. Our dogs work sheep every day and compete in agility on weekends, and we breed for the same balance of drive and off-switch that makes them good partners at home. We are just getting started, so we breed rarely and keep in close touch with every family that takes one of our puppies.",
        lines: [
            {
                breed: "Border Collie",
                sire: { name: "Ventura", lineage: "Working sheepdog line" },
                dam: { name: "Agatha", lineage: "Agility line" },
            },
        ],
        litterA: { name: "Bosque litter", ageDays: 42, puppyCount: 5, availableCount: 2 },
        litterB: { name: "Colheita litter", status: "PLANNED", line: 0 },
        puppies: { available: [["Faísca", "Female"], ["Trovão", "Male"]], reserved: ["Relâmpago", "Male"], sold: ["Chuva", "Female"] },
    },
    {
        owner: { fullName: "Patrícia Moura", email: "patricia.moura@demo.kennelos.test", phoneNumber: "85998761210" },
        name: "Pequeno Príncipe Spitz",
        city: "Fortaleza",
        state: "CE",
        latitude: -3.7319,
        longitude: -38.5267,
        isVerified: false,
        prestigeScore: 52,
        description:
            "Pequeno Príncipe Spitz breeds Pomeranians in Fortaleza, with an emphasis on sound knees, healthy teeth and a friendly, outgoing personality. Our small breeding group lives in the house with us, and puppies are handled daily, groomed from their first weeks and introduced to car rides and visitors before they go home. We stay in touch with our families and help with grooming questions for life.",
        lines: [
            {
                breed: "Pomeranian",
                sire: { name: "Algodão", lineage: "Brazilian show line" },
                dam: { name: "Pluma", lineage: "Brazilian show line" },
            },
        ],
        extraAdult: { breed: "Pomeranian", gender: "Female", name: "Nuvem", lineage: "Brazilian show line" },
        litterA: { name: "Estrela litter", ageDays: 55, puppyCount: 4, availableCount: 2 },
        litterB: { name: "Cometa litter", status: "PLANNED", line: 0 },
        puppies: { available: [["Pompom", "Male"], ["Floquinho", "Female"]], reserved: ["Princesa", "Female"], sold: ["Chantilly", "Female"] },
    },
];

// --- Generated content -------------------------------------------------------

const BREED_TRAITS: Record<string, { temperament: string; activity: string; coat: string }> = {
    "Siberian Husky": { temperament: "friendly, playful and endlessly social", activity: "long runs on cool mornings and pulling the training rig", coat: "a dense double coat" },
    "Alaskan Malamute": { temperament: "dignified, affectionate and strong-willed", activity: "hauling the cart on weekend hikes", coat: "a thick, coarse double coat" },
    Samoyed: { temperament: "gentle, cheerful and devoted to people", activity: "brisk walks and long cuddles on the sofa", coat: "a brilliant white stand-off coat" },
    "Golden Retriever": { temperament: "kind, patient and eager to please", activity: "swimming, retrieving and family picnics", coat: "a rich golden coat" },
    "Labrador Retriever": { temperament: "outgoing, even-tempered and food-motivated", activity: "fetch in the pool and long walks", coat: "a short, weatherproof coat" },
    Poodle: { temperament: "clever, elegant and quietly affectionate", activity: "puzzle games and scent work", coat: "a low-shedding curly coat" },
    "Doberman Pinscher": { temperament: "loyal, alert and remarkably sensitive to their people", activity: "obedience training and jogging", coat: "a sleek black-and-rust coat" },
    Rottweiler: { temperament: "calm, confident and protective without being reactive", activity: "obedience work and long walks", coat: "a dense black-and-mahogany coat" },
    "German Shepherd Dog": { temperament: "steady, intelligent and keen to work", activity: "tracking and obedience training", coat: "a medium-length double coat" },
    "French Bulldog": { temperament: "affectionate, comic and easygoing", activity: "short walks and naps in the sun", coat: "a fine, smooth coat" },
    Pug: { temperament: "charming, mischievous and devoted", activity: "short strolls and following their people from room to room", coat: "a soft fawn coat" },
    "Border Collie": { temperament: "focused, quick-thinking and tireless", activity: "herding sheep and agility practice", coat: "a medium-length rough coat" },
    Pomeranian: { temperament: "bold, lively and affectionate", activity: "indoor games and being carried around the garden", coat: "a profuse, fluffy double coat" },
};

function adultBio(name: string, gender: Gender, breed: string, kennel: string, adult: Adult, prospect: boolean, i: number) {
    const tr = BREED_TRAITS[breed];
    const [he, his] = gender === "Male" ? ["He", "his"] : ["She", "her"];
    if (prospect) {
        return `${name} is a young ${breed} ${gender === "Male" ? "male" : "female"} being evaluated for ${kennel}'s breeding program. ${he} is ${tr.temperament}, with ${tr.coat} and a promising build. ${he} comes from a ${adult.lineage.toLowerCase()} and will only be bred once ${his} health testing is complete. For now ${he.toLowerCase()} spends ${his} days on ${tr.activity}.`;
    }
    const role = gender === "Male" ? "sire" : "dam";
    const openers = [
        `${name} is one of ${kennel}'s foundation ${breed} ${role}s, from a ${adult.lineage.toLowerCase()}.`,
        `${name} anchors the ${breed} program at ${kennel} as a ${role} from a ${adult.lineage.toLowerCase()}.`,
        `Many of ${kennel}'s ${breed} puppies trace back to ${name}, a ${role} from a ${adult.lineage.toLowerCase()}.`,
    ];
    return `${openers[i % openers.length]} ${he} is ${tr.temperament}, with ${tr.coat} and a sound, balanced build that ${he.toLowerCase()} passes on consistently. Away from breeding ${he.toLowerCase()} lives with the family and loves ${tr.activity}. ${he} is fully health-tested before every litter.`;
}

function puppyBio(name: string, gender: Gender, breed: string, kennel: string, litterName: string, sire: string, dam: string, status: DogStatus) {
    const tr = BREED_TRAITS[breed];
    const [he, him] = gender === "Male" ? ["He", "him"] : ["She", "her"];
    const outlook = {
        AVAILABLE_PUPPY: `${he} is still looking for a family — ask the kennel about meeting ${him}.`,
        RESERVED: `${he} is reserved and will be going home soon.`,
        SOLD: `${he} has already gone home to a new family.`,
        BREEDING_STOCK: "",
    }[status];
    return `${name} is a ${breed} puppy from ${kennel}'s ${litterName}, by ${sire} out of ${dam}. ${he} is already showing the ${tr.temperament} nature of ${gender === "Male" ? "his" : "her"} parents. Like all our puppies, ${he.toLowerCase()} has been raised in the house with early neurological stimulation, daily handling and a gentle introduction to the crate, car rides and visitors. ${outlook}`;
}

// Parents of adults aren't modeled as dogs: clearly fictional registered
// names. Each is checked against every real dog name (filled in main()) so
// none reads as a cross-kennel pedigree link.
const realDogNames = new Set<string>();
const AFFIXES = ["Pedra Branca", "Rio Claro", "Campo Alto", "Mata Fria", "Porto Novo", "Lagoa Serena", "Cerro Azul", "Vila Aurora"];
const SIRE_NAMES = ["Orion", "Kodiak", "Tufão", "Apolo", "Tango", "Ícaro", "Bóris", "Sultão", "Netuno", "Vulcão", "Hércules"];
const DAM_NAMES = ["Brisa", "Estela", "Jasmim", "Kira", "Lis", "Maya", "Safira", "Vênus", "Dália", "Gaia", "Olívia"];
let parentIndex = 0;
function fictionalParents() {
    const i = parentIndex++;
    const parents = {
        sireName: `${AFFIXES[i % AFFIXES.length]} ${SIRE_NAMES[i % SIRE_NAMES.length]}`,
        damName: `${AFFIXES[(i + 3) % AFFIXES.length]} ${DAM_NAMES[i % DAM_NAMES.length]}`,
    };
    for (const name of Object.values(parents)) {
        if (realDogNames.has(name.toLowerCase())) throw new Error(`Fictional parent name "${name}" matches a real dog`);
    }
    return parents;
}

const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
let photoId = 1200; // place.dog ids, offset from every earlier seed
const photo = (w = 800, h = 600) => `https://place.dog/${w}/${h}?id=${photoId++}`;
const VIDEOS = [
    "https://res.cloudinary.com/demo/video/upload/so_2,du_4/dog.mp4",
    "https://res.cloudinary.com/demo/video/upload/so_5,du_4/dog.mp4",
    "https://res.cloudinary.com/demo/video/upload/so_8,du_4/dog.mp4",
    "https://res.cloudinary.com/demo/video/upload/so_12,du_4/dog.mp4",
];

// --- Insert -----------------------------------------------------------------

async function seedKennel(prisma: PrismaClient, spec: KennelSpec, index: number, passwordHash: string, breedIds: Map<string, string>) {
    const slug = slugify(spec.name);
    const existing = await prisma.owner.findUnique({ where: { email: spec.owner.email }, select: { id: true } });
    const existingKennel = await prisma.kennel.findUnique({ where: { slug }, select: { id: true } });
    if (existing || existingKennel) return { slug, skipped: true };

    const kennelBreeds = [...new Set([...spec.lines.map((l) => l.breed), ...(spec.extraAdult ? [spec.extraAdult.breed] : [])])];

    await prisma.$transaction(
        async (tx) => {
            const owner = await tx.owner.create({
                data: {
                    ...spec.owner,
                    passwordHash,
                    kennel: {
                        create: {
                            name: spec.name,
                            slug,
                            city: spec.city,
                            state: spec.state,
                            location: `${spec.city}, ${spec.state}`,
                            cnpj: `${40 + index}.${101 + index}.${201 + index}/0001-${10 + index}`,
                            cbkcRegistration: `CBKC-${3001 + index}`,
                            logoUrl: photo(200, 200),
                            description: spec.description,
                            prestigeScore: spec.prestigeScore,
                            latitude: spec.latitude,
                            longitude: spec.longitude,
                            isVerified: spec.isVerified,
                            primaryBreeds: kennelBreeds, // deprecated column, dual-written like /api/kennel does
                            breeds: { create: kennelBreeds.map((breed) => ({ breedId: breedIds.get(breed)! })) },
                        },
                    },
                },
                select: { kennel: { select: { id: true } } },
            });
            const kennelId = owner.kennel!.id;
            const takenSlugs = new Set<string>();
            const dogMedia: Prisma.MediaCreateManyInput[] = [];
            let adultIndex = 0;

            async function createDog(data: Omit<Prisma.DogUncheckedCreateInput, "kennelId" | "slug" | "lifeStage" | "photoUrls">, photoCount: number) {
                const dogSlug = nextAvailableSlug(slugify(data.name), takenSlugs);
                takenSlugs.add(dogSlug);
                const photoUrls = Array.from({ length: Math.min(photoCount, 3) }, () => photo(500, 400));
                const dog = await tx.dog.create({
                    data: { ...data, kennelId, slug: dogSlug, lifeStage: lifeStageFromStatus(data.status), photoUrls },
                    select: { id: true, name: true },
                });
                // Dog gallery = its photoUrls plus extra shots, all as Media rows.
                const gallery = [...photoUrls, ...Array.from({ length: photoCount - photoUrls.length }, () => photo())];
                dogMedia.push(...gallery.map((url) => ({ kennelId, dogId: dog.id, type: MediaType.PHOTO, url })));
                return dog;
            }

            async function createAdult(adult: Adult, breed: string, gender: Gender, prospect = false) {
                const i = adultIndex++;
                return createDog(
                    {
                        name: adult.name,
                        breed,
                        gender,
                        status: DogStatus.BREEDING_STOCK,
                        // 1–8 years old, plus an offset so no birthday lands on today.
                        birthDate: daysAgo(365 * (prospect ? 1 : 2 + ((index + i) % 6)) + 40 * (i + 1)),
                        registry: adult.registry ?? "CBKC",
                        lineage: adult.lineage,
                        pedigreeUrl: adult.pedigree ? `https://example.com/pedigrees/${slug}/${slugify(adult.name)}.pdf` : null,
                        bio: adultBio(adult.name, gender, breed, spec.name, adult, prospect, i),
                        ...fictionalParents(),
                    },
                    6,
                );
            }

            const pairs = [];
            for (const line of spec.lines) {
                pairs.push({
                    breed: line.breed,
                    sire: await createAdult(line.sire, line.breed, "Male"),
                    dam: await createAdult(line.dam, line.breed, "Female"),
                });
            }
            if (spec.extraAdult) {
                const { breed, gender, ...adult } = spec.extraAdult;
                await createAdult(adult, breed, gender, true);
            }

            // Litter A: always AVAILABLE, primary breed.
            const a = spec.litterA;
            const aBorn = daysAgo(a.ageDays);
            const litterA = {
                name: a.name,
                pair: pairs[0],
                born: aBorn as Date | null,
                row: await tx.litter.create({
                    data: {
                        kennelId,
                        name: a.name,
                        breed: pairs[0].breed,
                        status: LitterStatus.AVAILABLE,
                        puppyCount: a.puppyCount,
                        availableCount: a.availableCount,
                        bornAt: aBorn,
                        expectedGoHomeDate: new Date(aBorn.getTime() + 56 * DAY),
                        damId: pairs[0].dam.id,
                        sireId: pairs[0].sire.id,
                    },
                }),
            };

            // Litter B: older sold-out litter (~8 months), a recent reserved one, or planned.
            const b = spec.litterB;
            const bPair = pairs[b.line];
            const bBorn = b.status === "SOLD_OUT" ? daysAgo(240) : b.status === "RESERVED" ? daysAgo(33) : null;
            const litterB = {
                name: b.name,
                pair: bPair,
                born: bBorn,
                row: await tx.litter.create({
                    data: {
                        kennelId,
                        name: b.name,
                        breed: bPair.breed,
                        status: LitterStatus[b.status],
                        puppyCount: b.status === "PLANNED" ? 0 : b.status === "SOLD_OUT" ? 6 : 4,
                        availableCount: b.status === "PLANNED" ? null : 0,
                        bornAt: bBorn,
                        expectedGoHomeDate: bBorn ? new Date(bBorn.getTime() + 56 * DAY) : daysAgo(-(90 + index * 6)),
                        damId: bPair.dam.id,
                        sireId: bPair.sire.id,
                    },
                }),
            };

            const createPup = async ([name, gender]: Pup, status: DogStatus, litter: typeof litterA) =>
                createDog(
                    {
                        name,
                        breed: litter.pair.breed,
                        gender,
                        status,
                        birthDate: litter.born,
                        registry: "CBKC",
                        bio: puppyBio(name, gender, litter.pair.breed, spec.name, litter.name, litter.pair.sire.name, litter.pair.dam.name, status),
                        sireName: litter.pair.sire.name,
                        damName: litter.pair.dam.name,
                    },
                    4,
                );

            for (const pup of spec.puppies.available) await createPup(pup, DogStatus.AVAILABLE_PUPPY, litterA);
            await createPup(spec.puppies.reserved, DogStatus.RESERVED, b.status === "RESERVED" ? litterB : litterA);
            await createPup(spec.puppies.sold, DogStatus.SOLD, b.status === "SOLD_OUT" ? litterB : litterA);

            // Kennel gallery: 8 photos (2 per breed tab on multi-breed kennels,
            // the rest shared) + 1–2 videos.
            const tagged = kennelBreeds.length > 1 ? kennelBreeds.flatMap((breed) => [breed, breed]) : [];
            const kennelPhotos = Array.from({ length: 8 }, (_, i) => ({
                kennelId,
                type: MediaType.PHOTO,
                url: photo(),
                breedId: tagged[i] ? breedIds.get(tagged[i])! : null,
            }));
            const kennelVideos = VIDEOS.slice(index % 3, index % 3 + (index % 2 === 0 ? 2 : 1)).map((url) => ({
                kennelId,
                type: MediaType.VIDEO,
                url,
                breedId: null,
            }));
            await tx.media.createMany({ data: [...kennelPhotos, ...kennelVideos, ...dogMedia] });
        },
        { timeout: 120_000, maxWait: 20_000 },
    );
    return { slug, skipped: false };
}

async function main() {
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    try {
        // Breeds: reuse existing rows, create only what's missing.
        const needed = [...new Set(KENNELS.flatMap((k) => [...k.lines.map((l) => l.breed), ...(k.extraAdult ? [k.extraAdult.breed] : [])]))];
        for (const name of needed) await prisma.breed.upsert({ where: { name }, update: {}, create: { name } });
        const breedRows = await prisma.breed.findMany({ where: { name: { in: needed } }, select: { id: true, name: true } });
        const breedIds = new Map(breedRows.map((b) => [b.name, b.id]));
        const missing = needed.filter((n) => !breedIds.has(n));
        if (missing.length) throw new Error(`Breed rows missing after upsert: ${missing.join(", ")}`);

        // Guard: no new dog name may duplicate any dog already in the system,
        // and no fictional parent name may match a real dog.
        const batchDogNames = KENNELS.flatMap((k) => [
            ...k.lines.flatMap((l) => [l.sire.name, l.dam.name]),
            ...(k.extraAdult ? [k.extraAdult.name] : []),
            ...k.puppies.available.map((p) => p[0]),
            k.puppies.reserved[0],
            k.puppies.sold[0],
        ]);
        const pendingSlugs = KENNELS.map((k) => slugify(k.name));
        const otherDogs = await prisma.dog.findMany({ where: { kennel: { slug: { notIn: pendingSlugs } } }, select: { name: true } });
        const taken = new Set(otherDogs.map((d) => d.name.toLowerCase()));
        for (const name of [...taken, ...batchDogNames.map((n) => n.toLowerCase())]) realDogNames.add(name);
        const clashes = batchDogNames.filter((n, i) => taken.has(n.toLowerCase()) || batchDogNames.indexOf(n) !== i);
        if (clashes.length) throw new Error(`Dog names already in use: ${clashes.join(", ")}`);

        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
        for (const [i, spec] of KENNELS.entries()) {
            const result = await seedKennel(prisma, spec, i, passwordHash, breedIds);
            console.log(`${result.skipped ? "↷ skipped (exists)" : "✅ created"}  ${result.slug}`);
        }
        console.log(`\nAll demo owners log in with password: ${DEMO_PASSWORD}`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
