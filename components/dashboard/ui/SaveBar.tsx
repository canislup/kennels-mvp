"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import Button from "./Button";

/** FormData as a stable string, ignoring Next's internal $ACTION_* fields. */
function serialize(form: HTMLFormElement): string {
    return JSON.stringify([...new FormData(form).entries()].filter(([key]) => !key.startsWith("$")).map(([key, value]) => [key, String(value)]));
}

/**
 * Sticky footer for a form: "You have unsaved changes" only when the form's
 * FormData differs from its baseline, Cancel (a link) or Discard (`onDiscard`,
 * enabled while dirty; the form resets itself, then changes `resetKey`) and Submit. Warns before leaving
 * the page while dirty. Place it inside the <form>. Controls that change
 * hidden inputs from React state should dispatch a bubbling "input" event
 * (see notifyFormChange) so the bar notices.
 */
export default function SaveBar({
    cancelHref,
    onDiscard,
    submitLabel,
    pending,
    saved,
    resetKey,
}: {
    cancelHref?: string;
    /** Shows Discard instead of the Cancel link. */
    onDiscard?: () => void;
    submitLabel: string;
    pending: boolean;
    /** Show "All changes saved" while clean. */
    saved: boolean;
    /** Change this after a successful save to take a new baseline. */
    resetKey?: number;
}) {
    const t = useTranslations("dashboard.common.form");
    const rootRef = useRef<HTMLDivElement>(null);
    const baseline = useRef<string | null>(null);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        const form = rootRef.current?.closest("form");
        if (!form) return;
        // Take the baseline after React has applied any post-action form reset.
        const frame = requestAnimationFrame(() => {
            baseline.current = serialize(form);
            setDirty(false);
        });
        const check = () => requestAnimationFrame(() => setDirty(baseline.current !== null && serialize(form) !== baseline.current));
        form.addEventListener("input", check);
        form.addEventListener("change", check);
        form.addEventListener("reset", check);
        return () => {
            cancelAnimationFrame(frame);
            form.removeEventListener("input", check);
            form.removeEventListener("change", check);
            form.removeEventListener("reset", check);
        };
    }, [resetKey]);

    useEffect(() => {
        if (!dirty || pending) return;
        const warn = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty, pending]);

    return (
        <div
            ref={rootRef}
            className="sticky bottom-3 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-md sm:bottom-4 sm:px-6 sm:py-4"
        >
            <div role="status" aria-live="polite" className="min-h-5 text-[13px]">
                {dirty ? (
                    <span className="flex items-center gap-2 font-medium text-status-amber">
                        <span className="size-2 rounded-full bg-status-amber" aria-hidden />
                        {t("unsavedChanges")}
                    </span>
                ) : saved ? (
                    <span className="flex items-center gap-2 font-medium text-status-green">
                        <CheckCircle2 className="size-4" aria-hidden />
                        {t("allSaved")}
                    </span>
                ) : null}
            </div>
            <div className="ml-auto flex gap-2.5">
                {onDiscard ? (
                    <Button variant="secondary" onClick={onDiscard} disabled={!dirty || pending}>
                        {t("discard")}
                    </Button>
                ) : (
                    cancelHref && (
                        <Button href={cancelHref} variant="secondary">
                            {t("cancel")}
                        </Button>
                    )
                )}
                <Button type="submit" disabled={pending} aria-busy={pending}>
                    {pending ? t("saving") : submitLabel}
                </Button>
            </div>
        </div>
    );
}

/** Tell a SaveBar that a hidden input changed (React state updates don't fire input events). */
export function notifyFormChange(element: Element | null) {
    element?.closest("form")?.dispatchEvent(new Event("input", { bubbles: true }));
}
