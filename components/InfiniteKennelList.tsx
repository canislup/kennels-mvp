"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import KennelCard from "@/components/KennelCard";
import type { KennelCardData } from "@/lib/kennel-search";

type Status = "idle" | "loading" | "error" | "done";

// Appends page 2+ below the server-rendered first page. The parent keys this
// component on the query string, so changing filters resets it.
export default function InfiniteKennelList({
    query,
    initialHasMore,
}: {
    query: string;
    initialHasMore: boolean;
}) {
    const t = useTranslations("public.kennels.loading");
    const [kennels, setKennels] = useState<KennelCardData[]>([]);
    const [status, setStatus] = useState<Status>(initialHasMore ? "idle" : "done");
    const nextPage = useRef(2);
    const sentinel = useRef<HTMLDivElement>(null);

    const loadMore = useCallback(async () => {
        setStatus("loading");
        try {
            const params = new URLSearchParams(query);
            params.set("page", String(nextPage.current));
            const res = await fetch(`/api/kennels?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data: { kennels: KennelCardData[]; hasMore: boolean } = await res.json();
            nextPage.current += 1;
            setKennels((prev) => [...prev, ...data.kennels]);
            setStatus(data.hasMore ? "idle" : "done");
        } catch {
            setStatus("error");
        }
    }, [query]);

    // Start fetching ~one viewport before the user reaches the end.
    useEffect(() => {
        if (status !== "idle" || !sentinel.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) loadMore();
            },
            { rootMargin: "800px 0px" },
        );
        observer.observe(sentinel.current);
        return () => observer.disconnect();
    }, [status, loadMore]);

    return (
        <>
            {kennels.length > 0 && (
                <div className="mt-4.5 grid grid-cols-1 gap-4.5 sm:mt-7 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
                    {kennels.map((kennel) => (
                        <KennelCard key={kennel.id} kennel={kennel} />
                    ))}
                </div>
            )}

            {status === "idle" && <div ref={sentinel} aria-hidden className="h-px" />}

            {status === "loading" && (
                <div className="mt-6 sm:mt-7" role="status">
                    <div className="mb-4.5 text-center text-xs text-[#A8A29E] sm:mb-5.5 sm:text-[13px]">{t("more")}</div>
                    <div className="grid grid-cols-1 gap-4.5 opacity-70 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3" aria-hidden>
                        <SkeletonCard />
                        <SkeletonCard className="hidden sm:block" />
                        <SkeletonCard className="hidden lg:block" />
                    </div>
                </div>
            )}

            {status === "error" && (
                <div className="mt-7 flex items-center justify-center gap-3 text-[13px] text-[#78716C]" role="alert">
                    {t("error")}
                    <button
                        type="button"
                        onClick={loadMore}
                        className="font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                    >
                        {t("retry")}
                    </button>
                </div>
            )}
        </>
    );
}

const SKELETON = "bg-linear-[100deg] from-[#F0ECE3] from-30% via-[#F8F5EF] via-50% to-[#F0ECE3] to-70% bg-size-[200%_100%]";

function SkeletonCard({ className = "" }: { className?: string }) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-[#E7E2DA] bg-white ${className}`}>
            <div className={`h-50 w-full sm:h-55 ${SKELETON}`} />
            <div className="flex flex-col gap-2 px-4.5 py-4 sm:gap-2.5 sm:px-5.5 sm:py-5">
                <div className={`h-3.75 w-3/5 rounded-sm sm:h-4 sm:w-[70%] ${SKELETON}`} />
                <div className={`h-2.75 w-2/5 rounded-sm sm:h-3 sm:w-[45%] ${SKELETON}`} />
            </div>
        </div>
    );
}
