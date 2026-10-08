"use client";

import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { KennelSort } from "@/lib/kennel-search";

export const KENNEL_SORTS: KennelSort[] = ["prestige", "distance", "newest"];

type ParamUpdates = Record<string, string | null | undefined>;

// Browser geolocation, rounded to ~1km so precise coordinates never land in
// URLs, history or server logs. Resolves null if denied/unavailable.
function requestOrigin(): Promise<{ lat: string; lng: string } | null> {
    return new Promise((resolve) => {
        if (!("geolocation" in navigator)) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) =>
                resolve({ lat: coords.latitude.toFixed(2), lng: coords.longitude.toFixed(2) }),
            () => resolve(null),
            { timeout: 10_000, maximumAge: 10 * 60_000 },
        );
    });
}

// Distance sort only takes effect with an origin, otherwise it's prestige.
export function effectiveSort(searchParams: URLSearchParams): KennelSort {
    const sort = searchParams.get("sort");
    if (sort === "newest") return "newest";
    if (sort === "distance" && searchParams.get("lat") && searchParams.get("lng")) return "distance";
    return "prestige";
}

// The URL is the single source of truth for directory filters; every control
// reads from and writes back to the query string.
export function useDirectoryParams() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const buildQuery = (updates: ParamUpdates, base = searchParams) => {
        const params = new URLSearchParams(base.toString());
        for (const [key, value] of Object.entries(updates)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        return params;
    };

    const navigate = (params: URLSearchParams) => {
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    const push = (updates: ParamUpdates) => navigate(buildQuery(updates));

    // Null when distance was requested but location access was denied, so
    // the caller can leave the previous sort in place.
    const sortUpdates = async (sort: KennelSort): Promise<ParamUpdates | null> => {
        if (sort !== "distance") {
            return { sort: sort === "prestige" ? null : sort, lat: null, lng: null };
        }
        const origin = await requestOrigin();
        return origin ? { sort, ...origin } : null;
    };

    const setSort = async (sort: KennelSort) => {
        const updates = await sortUpdates(sort);
        if (!updates) return false;
        push(updates);
        return true;
    };

    const clear = () => router.push(pathname);

    return { searchParams, buildQuery, navigate, push, sortUpdates, setSort, clear };
}
