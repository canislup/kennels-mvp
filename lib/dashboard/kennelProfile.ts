// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Partly real: the starting point is the real Kennel row, its KennelBreed
// rows and the Owner's email/phone; the slug check reads real kennels; breeds
// come from the real Breed table and the dog/litter counts from real rows.
// Saved changes live in the mock store and nothing is written to the database.)
//
// Settings → Kennel profile. `kennelId` is the session's kennel
// (getCurrentKennel), never a value from the browser. Mutations are called
// from app/[locale]/dashboard/settings/actions.ts.
import { prisma } from "@/lib/db";
import { isSameBreed } from "@/lib/breeds";
import { getMockStore, snapshot } from "./mock/store";
import type { MockKennelProfile, MockRegistration } from "./mock/settings";
import {
    DEFAULT_TIME_ZONE,
    maskRegistration,
    onlyDigits,
    slugProblem,
    type KennelContactInput,
    type KennelIdentityInput,
    type KennelImagesInput,
    type KennelLocationInput,
    type KennelProfileInput,
    type KennelRegistrationInput,
} from "./validation/kennelProfile";
import type { GeocodeResult, KennelBreedOption, KennelProfile, ProfileStrength, SimpleMutationResult, SlugAvailability } from "./types";

// --- Reading the saved profile ---------------------------------------------------------

/** The saved profile record, created from the real row the first time (see MockKennelProfile). */
async function savedProfile(kennelId: string): Promise<MockKennelProfile | null> {
    const store = getMockStore();
    const existing = store.kennelProfiles[kennelId];
    if (existing) return existing;

    const kennel = await prisma.kennel.findUnique({
        where: { id: kennelId },
        select: {
            name: true,
            slug: true,
            city: true,
            state: true,
            description: true,
            logoUrl: true,
            location: true,
            latitude: true,
            longitude: true,
            breeds: { select: { breedId: true }, orderBy: { createdAt: "asc" } },
            owner: { select: { email: true, phoneNumber: true } },
        },
    });
    if (!kennel) return null;

    const phone = kennel.owner.phoneNumber ?? null;
    const record: MockKennelProfile = {
        name: kennel.name,
        slug: kennel.slug,
        city: kennel.city,
        state: kennel.state,
        description: kennel.description,
        timeZone: DEFAULT_TIME_ZONE, // NEW FIELD: no value on file yet
        logo: kennel.logoUrl ? { url: kennel.logoUrl, publicId: null } : null,
        cover: null, // NEW FIELD
        breedIds: kennel.breeds.map((b) => b.breedId),
        breedingSince: null, // NEW FIELD
        // NEW FIELDS. Fixture start: the owner's phone and email, shown; the rest empty.
        contact: {
            phone: { value: phone, isPublic: Boolean(phone) },
            email: { value: kennel.owner.email, isPublic: true },
            website: { value: null, isPublic: false },
            instagram: { value: null, isPublic: false },
            whatsapp: { value: phone, isPublic: false },
        },
        location: { address: kennel.location || `${kennel.city}, ${kennel.state}`, latitude: kennel.latitude, longitude: kennel.longitude },
    };
    store.kennelProfiles[kennelId] = record;
    return record;
}

/**
 * The CNPJ/CPF and CBKC number on file: the mock store once saved, otherwise
 * the real Kennel row (cnpj, cbkcRegistration). Digits only. Server only:
 * never return this to the browser (use the masked forms).
 */
export async function readRegistration(kennelId: string): Promise<MockRegistration> {
    const saved = getMockStore().registration;
    if (saved) return saved;
    const kennel = await prisma.kennel.findUnique({ where: { id: kennelId }, select: { cnpj: true, cbkcRegistration: true } });
    const cnpj = kennel?.cnpj ? onlyDigits(kennel.cnpj) : "";
    return { cnpj: cnpj || null, cpf: null, cbkcRegistration: kennel?.cbkcRegistration ?? null };
}

/**
 * The kennel's stored IANA time zone (NEW FIELD Kennel.timeZone), or null when
 * none is set. In the mock it exists once the profile was loaded or saved.
 */
export async function getKennelTimeZone(kennelId: string): Promise<string | null> {
    return getMockStore().kennelProfiles[kennelId]?.timeZone ?? null;
}

/** For getCurrentKennel(): the saved profile's shell fields, if this kennel's profile was ever loaded. */
export function savedShellOverrides(kennelId: string): { name: string; slug: string; city: string; state: string; logoUrl: string | null } | null {
    const saved = getMockStore().kennelProfiles[kennelId];
    return saved ? { name: saved.name, slug: saved.slug, city: saved.city, state: saved.state, logoUrl: saved.logo?.url ?? null } : null;
}

/** Breed id → name and how many of the kennel's dogs and litters use it (Dog.breed / Litter.breed are free text). */
async function breedsWithUsage(kennelId: string, breedIds: string[]) {
    const [breeds, dogs, litters] = await Promise.all([
        prisma.breed.findMany({ where: { id: { in: breedIds } }, select: { id: true, name: true } }),
        prisma.dog.findMany({ where: { kennelId }, select: { breed: true } }),
        prisma.litter.findMany({ where: { kennelId }, select: { breed: true } }),
    ]);
    return breedIds.flatMap((id) => {
        const breed = breeds.find((b) => b.id === id);
        if (!breed) return [];
        return [
            {
                id: breed.id,
                name: breed.name,
                dogCount: dogs.filter((d) => isSameBreed(d.breed, breed.name)).length,
                litterCount: litters.filter((l) => isSameBreed(l.breed, breed.name)).length,
            },
        ];
    });
}

export async function getKennelProfile(kennelId: string): Promise<KennelProfile | null> {
    const saved = await savedProfile(kennelId);
    if (!saved) return null;
    const [registration, breeds] = await Promise.all([readRegistration(kennelId), breedsWithUsage(kennelId, saved.breedIds)]);
    const verificationStatus = getMockStore().verification.status;
    const type = registration.cnpj ? "CNPJ" : registration.cpf ? "CPF" : null;
    const digits = registration.cnpj ?? registration.cpf;

    return snapshot({
        name: saved.name,
        slug: saved.slug,
        city: saved.city,
        state: saved.state,
        description: saved.description ?? "",
        logo: saved.logo,
        cover: saved.cover,
        breeds,
        registration: {
            type,
            // Masked here, on the server: the full number never reaches the browser.
            maskedNumber: type && digits ? maskRegistration(type, digits) : null,
            cbkcRegistration: registration.cbkcRegistration,
            breedingSince: saved.breedingSince,
        },
        contact: {
            phone: { value: saved.contact.phone.value ?? "", isPublic: saved.contact.phone.isPublic },
            email: { value: saved.contact.email.value ?? "", isPublic: saved.contact.email.isPublic },
            website: { value: saved.contact.website.value ?? "", isPublic: saved.contact.website.isPublic },
            instagram: { value: saved.contact.instagram.value ? `@${saved.contact.instagram.value}` : "", isPublic: saved.contact.instagram.isPublic },
            whatsapp: { value: saved.contact.whatsapp.value ?? "", isPublic: saved.contact.whatsapp.isPublic },
        },
        location: { address: saved.location.address ?? "", latitude: saved.location.latitude, longitude: saved.location.longitude },
        timeZone: saved.timeZone,
        verificationStatus,
        publicPagePath: saved.slug ? `/kennel/${saved.slug}` : null,
    });
}

/** Every breed in the Breed table, by name (the "Add a breed" list). REAL. */
export async function listBreedOptions(): Promise<KennelBreedOption[]> {
    return prisma.breed.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

// --- Checks that need the database -------------------------------------------------------

/** Format, reserved words, then real kennels other than this one (and this kennel's saved mock slug is its own). */
export async function checkSlugAvailability(kennelId: string, slug: string): Promise<SlugAvailability> {
    const problem = slugProblem(slug);
    if (problem) return { available: false, reason: problem };
    const taken = await prisma.kennel.findFirst({ where: { slug, NOT: { id: kennelId } }, select: { id: true } });
    // Mock: slugs other kennels saved in the mock store count too.
    const takenInMock = Object.entries(getMockStore().kennelProfiles).some(([id, profile]) => id !== kennelId && profile.slug === slug);
    return taken || takenInMock ? { available: false, reason: "taken" } : { available: true };
}

async function breedIdsExist(breedIds: string[]): Promise<boolean> {
    const count = await prisma.breed.count({ where: { id: { in: breedIds } } });
    return count === breedIds.length;
}

/** Kennel.cnpj is @unique (and Kennel.cpf will be): another kennel using the number is an error. */
async function registrationTaken(kennelId: string, input: KennelRegistrationInput): Promise<boolean> {
    if (!input.number || input.type !== "CNPJ") return false; // no real CPF column yet
    const formatted = input.number.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    const other = await prisma.kennel.findFirst({ where: { cnpj: { in: [input.number, formatted] }, NOT: { id: kennelId } }, select: { id: true } });
    return Boolean(other);
}

// --- Mutation ------------------------------------------------------------------------------
// saveKennelProfile runs every database check first and then writes all
// sections together, so a failed save writes nothing (the real version: one
// transaction).

type Draft = { profile: MockKennelProfile; registration: MockRegistration };

function applyIdentity(draft: Draft, input: KennelIdentityInput) {
    Object.assign(draft.profile, input);
}
function applyImages(draft: Draft, input: KennelImagesInput) {
    draft.profile.logo = input.logo;
    draft.profile.cover = input.cover;
}
function applyRegistration(draft: Draft, input: KennelRegistrationInput) {
    if (input.number) {
        draft.registration.cnpj = input.type === "CNPJ" ? input.number : null;
        draft.registration.cpf = input.type === "CPF" ? input.number : null;
    }
    draft.registration.cbkcRegistration = input.cbkcRegistration;
    draft.profile.breedingSince = input.breedingSince;
    // The real backend sets verification back to review when the number changes
    // while PENDING or APPROVED (ENDPOINTS.md). The mock never changes the status.
}
function applyContact(draft: Draft, input: KennelContactInput) {
    draft.profile.contact = input;
}
function applyLocation(draft: Draft, input: KennelLocationInput) {
    draft.profile.location = input;
}

async function draftFor(kennelId: string): Promise<Draft | null> {
    const profile = await savedProfile(kennelId);
    if (!profile) return null;
    return { profile: structuredClone(profile), registration: structuredClone(await readRegistration(kennelId)) };
}

function commit(kennelId: string, draft: Draft) {
    const store = getMockStore();
    store.kennelProfiles[kennelId] = draft.profile;
    store.registration = draft.registration;
}

const NOT_FOUND: SimpleMutationResult = { ok: false, fieldErrors: {}, formError: { key: "kennelNotFound" } };

async function identityErrors(kennelId: string, input: KennelIdentityInput) {
    const slug = await checkSlugAvailability(kennelId, input.slug);
    if (slug.available) return null;
    return { slug: { key: slug.reason === "taken" ? "slugTaken" : slug.reason === "reserved" ? "slugReserved" : "slugInvalid" } };
}

/** The whole form: every database check first, then every section at once. Nothing is written on any error. */
export async function saveKennelProfile(kennelId: string, input: KennelProfileInput): Promise<SimpleMutationResult> {
    const draft = await draftFor(kennelId);
    if (!draft) return NOT_FOUND;
    const [identity, breedsOk, numberTaken] = await Promise.all([identityErrors(kennelId, input.identity), breedIdsExist(input.breedIds), registrationTaken(kennelId, input.registration)]);
    const fieldErrors = { ...identity };
    if (!breedsOk) Object.assign(fieldErrors, { breedIds: { key: "unknownBreed" } });
    if (numberTaken) Object.assign(fieldErrors, { registrationNumber: { key: "registrationTaken" } });
    if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

    applyIdentity(draft, input.identity);
    applyImages(draft, input.images);
    draft.profile.breedIds = [...input.breedIds];
    applyRegistration(draft, input.registration);
    applyContact(draft, input.contact);
    applyLocation(draft, input.location);
    commit(kennelId, draft);
    return { ok: true };
}

// --- Address lookup (MOCK ONLY: no network call) -------------------------------------------

type Place = { name: string; uf: string; lat: number; lng: number; capital?: true };

/** City centers, rounded to 3 decimals (≈ 100 m). State capitals are the per-state fallback. */
const PLACES: Place[] = [
    { name: "São Paulo", uf: "SP", lat: -23.551, lng: -46.633, capital: true },
    { name: "Campinas", uf: "SP", lat: -22.906, lng: -47.061 },
    { name: "Rio de Janeiro", uf: "RJ", lat: -22.907, lng: -43.173, capital: true },
    { name: "Belo Horizonte", uf: "MG", lat: -19.917, lng: -43.935, capital: true },
    { name: "Brasília", uf: "DF", lat: -15.794, lng: -47.882, capital: true },
    { name: "Salvador", uf: "BA", lat: -12.978, lng: -38.502, capital: true },
    { name: "Fortaleza", uf: "CE", lat: -3.732, lng: -38.527, capital: true },
    { name: "Recife", uf: "PE", lat: -8.048, lng: -34.877, capital: true },
    { name: "Curitiba", uf: "PR", lat: -25.428, lng: -49.273, capital: true },
    { name: "Porto Alegre", uf: "RS", lat: -30.035, lng: -51.218, capital: true },
    { name: "Florianópolis", uf: "SC", lat: -27.595, lng: -48.548, capital: true },
    { name: "Goiânia", uf: "GO", lat: -16.687, lng: -49.265, capital: true },
    { name: "Manaus", uf: "AM", lat: -3.119, lng: -60.022, capital: true },
    { name: "Belém", uf: "PA", lat: -1.456, lng: -48.49, capital: true },
    { name: "Vitória", uf: "ES", lat: -20.315, lng: -40.312, capital: true },
    { name: "Natal", uf: "RN", lat: -5.795, lng: -35.209, capital: true },
    { name: "João Pessoa", uf: "PB", lat: -7.12, lng: -34.845, capital: true },
    { name: "Maceió", uf: "AL", lat: -9.666, lng: -35.735, capital: true },
    { name: "Aracaju", uf: "SE", lat: -10.947, lng: -37.073, capital: true },
    { name: "Teresina", uf: "PI", lat: -5.089, lng: -42.802, capital: true },
    { name: "São Luís", uf: "MA", lat: -2.53, lng: -44.303, capital: true },
    { name: "Campo Grande", uf: "MS", lat: -20.47, lng: -54.62, capital: true },
    { name: "Cuiabá", uf: "MT", lat: -15.601, lng: -56.097, capital: true },
    { name: "Palmas", uf: "TO", lat: -10.184, lng: -48.333, capital: true },
    { name: "Porto Velho", uf: "RO", lat: -8.762, lng: -63.904, capital: true },
    { name: "Rio Branco", uf: "AC", lat: -9.975, lng: -67.825, capital: true },
    { name: "Macapá", uf: "AP", lat: 0.035, lng: -51.07, capital: true },
    { name: "Boa Vista", uf: "RR", lat: 2.82, lng: -60.672, capital: true },
];

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * MOCK ONLY. A known city name anywhere in the text → that city; otherwise an
 * upper-case state code ("…, PR") → that state's capital; otherwise null.
 * Deterministic, no network call. The real version calls a geocoding provider
 * server-side (ENDPOINTS.md).
 */
export async function lookupAddress(address: string): Promise<GeocodeResult | null> {
    const text = fold(address);
    const city = PLACES.filter((place) => new RegExp(`\\b${fold(place.name)}\\b`).test(text)).sort((a, b) => b.name.length - a.name.length)[0];
    if (city) return { lat: city.lat, lng: city.lng, formatted: `${city.name}, ${city.uf}, Brasil` };
    const uf = address.match(/\b[A-Z]{2}\b/g)?.find((code) => PLACES.some((place) => place.uf === code && place.capital));
    const capital = uf ? PLACES.find((place) => place.uf === uf && place.capital) : undefined;
    return capital ? { lat: capital.lat, lng: capital.lng, formatted: `${capital.uf}, Brasil` } : null;
}

// --- Profile strength (from SAVED data) ------------------------------------------------------

/**
 * Weights (sum 100): identity 10 (name, slug, city, state), logo 15, cover
 * 10, description of 150+ characters 15, at least one breed 10, at least one
 * contact shown on the page 10, map coordinates 10, verification 20 (APPROVED;
 * PENDING earns half). Missing items link to their section; verification is
 * the separate nudge on the card, so it's not in `missing`.
 */
const PROFILE_STRENGTH_DESCRIPTION_MIN = 150;

export async function getProfileStrength(kennelId: string): Promise<ProfileStrength> {
    const profile = await getKennelProfile(kennelId);
    if (!profile) return { percent: 0, missing: [] };
    const checks = [
        { key: "identity", weight: 10, done: Boolean(profile.name && profile.slug && profile.city && profile.state), href: "#profile-identity" },
        { key: "logo", weight: 15, done: Boolean(profile.logo), href: "#profile-logo" },
        { key: "cover", weight: 10, done: Boolean(profile.cover), href: "#profile-cover" },
        { key: "description", weight: 15, done: profile.description.length >= PROFILE_STRENGTH_DESCRIPTION_MIN, href: "#profile-description" },
        { key: "breeds", weight: 10, done: profile.breeds.length > 0, href: "#profile-breeds" },
        { key: "contact", weight: 10, done: Object.values(profile.contact).some((c) => c.isPublic && c.value), href: "#profile-contact" },
        { key: "location", weight: 10, done: profile.location.latitude !== null && profile.location.longitude !== null, href: "#profile-location" },
    ] as const;
    const verification = profile.verificationStatus === "APPROVED" ? 20 : profile.verificationStatus === "PENDING" ? 10 : 0;
    const percent = checks.reduce((sum, check) => sum + (check.done ? check.weight : 0), verification);
    return { percent, missing: checks.filter((check) => !check.done).map(({ key, href }) => ({ key, href })) };
}
