"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import Button from "@/components/dashboard/ui/Button";
import TextInput from "@/components/dashboard/ui/TextInput";

/**
 * A read-only link with a Copy button. Uses the clipboard API; when that's
 * unavailable or refused, it selects the text so the user can copy it, and
 * says so. Results are announced in an aria-live region.
 */
export default function CopyLink({ id, path, label }: { id: string; path: string; label: string }) {
    const t = useTranslations("dashboard.reviews.invite");
    const inputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
    // Only rendered after an action result (client side), so window is available.
    const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();

    async function copy() {
        try {
            await navigator.clipboard.writeText(url);
            setStatus("copied");
        } catch {
            inputRef.current?.focus();
            inputRef.current?.select();
            setStatus("manual");
        }
    }

    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                {label}
            </label>
            <div className="flex gap-2">
                <TextInput ref={inputRef} id={id} readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 bg-stone-50 text-[13px]" />
                <Button variant="secondary" onClick={copy} className="shrink-0">
                    <Copy className="size-4" aria-hidden />
                    {t("copy")}
                </Button>
            </div>
            <p role="status" aria-live="polite" className="mt-1.5 min-h-4 text-xs font-medium text-status-green">
                {status === "copied" ? t("copied") : status === "manual" ? <span className="text-stone-600">{t("copyManual")}</span> : null}
            </p>
        </div>
    );
}
