import { prisma } from "@/lib/db";
import type { Prisma } from "@/prisma/generated/client";

export const KENNEL_PAGE_SIZE = 12; // Divisible by 1/2/3 so appended pages line up with the grid

export type KennelSort = "prestige" | "distance" | "newest";

export type KennelSearchFilters = {
    breed?: string;
    location?: string;
    puppies: boolean;
    verified: boolean;
    sort: KennelSort;
    // Viewer coordinates for distance sort, taken from browser geolocation.
    lat?: number;
    lng?: number;
};

// Serializable shape shared by the SSR page and the /api/kennels route.
export type KennelCardData = {
    id: string;
    slug: string;
    name: string;
    location: string;
    breed: string | null;
    prestigeScore: number;
    isVerified: boolean;
    hasPuppies: boolean;
    photoUrl: string | null;
};

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function readParam(params: RawParams, key: string): string | undefined {
    const value = params instanceof URLSearchParams ? params.get(key) : params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return first?.trim() || undefined;
}

function readCoordinate(params: RawParams, key: string, limit: number): number | undefined {
    const raw = readParam(params, key);
    if (raw === undefined) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) && Math.abs(value) <= limit ? value : undefined;
}

export function parseKennelSearch(params: RawParams): KennelSearchFilters {
    const sortParam = readParam(params, "sort");
    const lat = readCoordinate(params, "lat", 90);
    const lng = readCoordinate(params, "lng", 180);
    const hasOrigin = lat !== undefined && lng !== undefined;

    let sort: KennelSort = "prestige";
    if (sortParam === "newest") sort = "newest";
    // Distance without an origin can't be computed, so fall back to prestige.
    if (sortParam === "distance" && hasOrigin) sort = "distance";

    return {
        breed: readParam(params, "breed"),
        location: readParam(params, "location"),
        puppies: readParam(params, "puppies") === "true",
        verified: readParam(params, "verified") === "true",
        sort,
        lat: hasOrigin ? lat : undefined,
        lng: hasOrigin ? lng : undefined,
    };
}

function locationWhere(location: string): Prisma.KennelWhereInput {
    const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
    const [city, state] = location.split(",").map((part) => part.trim());

    // "Portland, OR" → city + state; a single term matches any location field.
    if (city && state) {
        return {
            OR: [
                { location: contains(location) },
                { AND: [{ city: contains(city) }, { state: contains(state) }] },
            ],
        };
    }

    return {
        OR: [{ location: contains(location) }, { city: contains(location) }, { state: contains(location) }],
    };
}

// Every filter is its own AND clause so relation filters (e.g. breed and
// puppies, both on `dogs`) combine instead of overwriting each other.
export function buildKennelWhere(filters: KennelSearchFilters): Prisma.KennelWhereInput {
    const clauses: Prisma.KennelWhereInput[] = [];

    if (filters.breed) {
        clauses.push({
            dogs: { some: { breed: { equals: filters.breed, mode: "insensitive" } } },
        });
    }
    if (filters.puppies) {
        clauses.push({ dogs: { some: { status: "AVAILABLE_PUPPY" } } });
    }
    if (filters.verified) {
        clauses.push({ isVerified: true });
    }
    if (filters.location) {
        clauses.push(locationWhere(filters.location));
    }

    return { AND: clauses };
}

const cardSelect = {
    id: true,
    slug: true,
    name: true,
    location: true,
    city: true,
    state: true,
    prestigeScore: true,
    isVerified: true,
    primaryBreeds: true,
    dogs: {
        where: { photoUrls: { isEmpty: false } },
        select: { photoUrls: true },
        take: 1,
    },
    _count: {
        select: { dogs: { where: { status: "AVAILABLE_PUPPY" } } },
    },
} satisfies Prisma.KennelSelect;

type CardRow = Prisma.KennelGetPayload<{ select: typeof cardSelect }>;

function toCardData(row: CardRow, filters: KennelSearchFilters): KennelCardData {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        location: row.location.trim() || [row.city, row.state].filter(Boolean).join(", "),
        // A breed-filtered kennel is guaranteed to have that breed, so show it.
        breed: filters.breed ?? row.primaryBreeds[0] ?? null,
        prestigeScore: row.prestigeScore,
        isVerified: row.isVerified,
        hasPuppies: row._count.dogs > 0,
        photoUrl: row.dogs[0]?.photoUrls[0] ?? null,
    };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// Prisma can't ORDER BY a computed distance, so rank the matching ids in
// memory, then load only the requested page. Fine at MVP scale; move to
// PostGIS / a raw query once the directory grows.
async function pageIdsByDistance(
    where: Prisma.KennelWhereInput,
    filters: KennelSearchFilters,
    skip: number,
): Promise<string[]> {
    const rows = await prisma.kennel.findMany({
        where,
        select: { id: true, latitude: true, longitude: true, prestigeScore: true },
    });

    const distanceOf = (row: (typeof rows)[number]) =>
        row.latitude === null || row.longitude === null
            ? Infinity // Kennels without coordinates sort last
            : haversineKm(filters.lat!, filters.lng!, row.latitude, row.longitude);

    return rows
        .map((row) => ({ row, distance: distanceOf(row) }))
        .sort(
            (a, b) =>
                a.distance - b.distance ||
                b.row.prestigeScore - a.row.prestigeScore ||
                a.row.id.localeCompare(b.row.id),
        )
        .slice(skip, skip + KENNEL_PAGE_SIZE)
        .map(({ row }) => row.id);
}

// Homepage "Featured this week": top kennels by prestige. Also backs the
// profile's "More {breed} kennels" rail via the optional breed filter.
export async function getFeaturedKennels(
    limit = 3,
    { breedId, excludeKennelId }: { breedId?: string; excludeKennelId?: string } = {},
): Promise<KennelCardData[]> {
    const rows = await prisma.kennel.findMany({
        where: {
            ...(breedId && { breeds: { some: { breedId } } }),
            ...(excludeKennelId && { id: { not: excludeKennelId } }),
        },
        select: cardSelect,
        orderBy: [{ prestigeScore: "desc" }, { id: "asc" }],
        take: limit,
    });
    const noFilters: KennelSearchFilters = { puppies: false, verified: false, sort: "prestige" };
    return rows.map((row) => toCardData(row, noFilters));
}

export async function searchKennels(filters: KennelSearchFilters, page = 1) {
    const where = buildKennelWhere(filters);
    const skip = (page - 1) * KENNEL_PAGE_SIZE;

    let rowsPromise: Promise<CardRow[]>;

    if (filters.sort === "distance") {
        rowsPromise = pageIdsByDistance(where, filters, skip).then(async (ids) => {
            const rows = await prisma.kennel.findMany({ where: { id: { in: ids } }, select: cardSelect });
            const byId = new Map(rows.map((row) => [row.id, row]));
            return ids.map((id) => byId.get(id)).filter((row): row is CardRow => Boolean(row));
        });
    } else {
        rowsPromise = prisma.kennel.findMany({
            where,
            select: cardSelect,
            // id tiebreaker keeps offsets stable between pages.
            orderBy:
                filters.sort === "newest"
                    ? [{ createdAt: "desc" }, { id: "asc" }]
                    : [{ prestigeScore: "desc" }, { id: "asc" }],
            skip,
            take: KENNEL_PAGE_SIZE,
        });
    }

    const [rows, total] = await Promise.all([rowsPromise, prisma.kennel.count({ where })]);

    return {
        kennels: rows.map((row) => toCardData(row, filters)),
        total,
        hasMore: skip + rows.length < total,
    };
}
