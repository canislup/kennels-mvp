import { NextRequest, NextResponse } from "next/server";
import { parseKennelSearch, searchKennels } from "@/lib/kennel-search";

// Next page of directory results for the infinite-scroll list. Page 1 is
// server-rendered by /[locale]/kennels; this only serves page 2+.
export const GET = async (request: NextRequest) => {
    const params = request.nextUrl.searchParams;
    const page = Number(params.get("page"));

    if (!Number.isInteger(page) || page < 1 || page > 1000) {
        return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }

    try {
        const { kennels, hasMore } = await searchKennels(parseKennelSearch(params), page);
        return NextResponse.json({ kennels, hasMore });
    } catch (error) {
        console.error("Kennel directory page error:", error);
        return NextResponse.json({ error: "Failed to load kennels" }, { status: 500 });
    }
};
