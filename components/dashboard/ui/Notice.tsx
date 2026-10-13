"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";

export type NoticeTone = "success" | "info" | "warning" | "error";

const TONES: Record<NoticeTone, { box: string; icon: typeof Info }> = {
    success: { box: "border-status-green-bg bg-status-green-bg text-status-green", icon: CheckCircle2 },
    info: { box: "border-accent-soft bg-accent-soft text-accent", icon: Info },
    warning: { box: "border-status-amber-bg bg-status-amber-bg text-status-amber", icon: AlertCircle },
    error: { box: "border-status-red-bg bg-status-red-bg text-status-red", icon: AlertCircle },
};

/**
 * Banner announced politely to screen readers. Dismissible by default; pass
 * `clearParam` to also drop that search param from the URL on dismiss
 * (e.g. `?notice=created`; an array drops several), so a reload doesn't bring it back.
 */
export default function Notice({
    tone = "info",
    children,
    dismissible = true,
    clearParam,
    className = "",
}: {
    tone?: NoticeTone;
    children: ReactNode;
    dismissible?: boolean;
    clearParam?: string | string[];
    className?: string;
}) {
    const t = useTranslations("dashboard.common");
    const router = useRouter();
    const pathname = usePathname();
    const [visible, setVisible] = useState(true);
    const { box, icon: Icon } = TONES[tone];

    function dismiss() {
        setVisible(false);
        if (clearParam) {
            const params = new URLSearchParams(window.location.search);
            for (const name of ([] as string[]).concat(clearParam)) params.delete(name);
            const query = params.toString();
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }
    }

    return (
        <div role="status" aria-live="polite" className={className}>
            {visible && (
                <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${box}`}>
                    <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">{children}</div>
                    {dismissible && (
                        <button
                            type="button"
                            onClick={dismiss}
                            aria-label={t("dismiss")}
                            className="-m-1 rounded-lg p-1 opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
                        >
                            <X className="size-4" aria-hidden />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
