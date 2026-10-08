"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";

// Native share sheet where supported (mobile), clipboard copy elsewhere.
export default function KennelShareButton({ kennelName }: { kennelName: string }) {
    const t = useTranslations("public.kennel.share");
    const [status, setStatus] = useState<"" | "copied" | "failed">("");

    async function share() {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: kennelName, url });
                return;
            } catch (error) {
                // User dismissed the sheet — nothing to report.
                if ((error as DOMException).name === "AbortError") return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            setStatus("copied");
        } catch {
            setStatus("failed");
        }
        setTimeout(() => setStatus(""), 2500);
    }

    return (
        <span className="relative ml-1 inline-flex">
            <button
                type="button"
                onClick={share}
                aria-label={t("label")}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#E7E2DA] bg-white text-[#57534E] transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5]"
            >
                <Share2 className="size-3.75" strokeWidth={2} aria-hidden />
            </button>
            <span
                role="status"
                aria-live="polite"
                className={`absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-md bg-[#1C1917] px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[#FBF9F6] transition-opacity ${status ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
                {status && t(status)}
            </span>
        </span>
    );
}
