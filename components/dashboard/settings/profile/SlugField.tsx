"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { checkSlugAction } from "@/app/[locale]/dashboard/settings/actions";
import type { FieldControlProps } from "@/components/dashboard/ui/Field";

type Status = "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";

const STATUS_CLASSES: Record<Exclude<Status, "idle">, string> = {
    checking: "text-stone-500",
    available: "text-status-green",
    taken: "text-status-red",
    reserved: "text-status-red",
    invalid: "text-status-red",
};

const DELAY_MS = 400;

/**
 * "kennelos.com/kennel/" + the slug, with a live availability hint. The check
 * runs 400 ms after typing stops, only when the value differs from the saved
 * slug; the save re-checks on the server. Uncontrolled (the form remounts it).
 */
export default function SlugField({ control, name, defaultValue, savedSlug }: { control: FieldControlProps; name: string; defaultValue: string; savedSlug: string }) {
    const t = useTranslations("dashboard.settings.profile.identity.slugStatus");
    const [changed, setChanged] = useState(defaultValue !== savedSlug);
    const [status, setStatus] = useState<Status>(defaultValue !== savedSlug ? "checking" : "idle");
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const latest = useRef(0);

    function schedule(value: string) {
        clearTimeout(timer.current);
        const request = ++latest.current;
        timer.current = setTimeout(async () => {
            const result = await checkSlugAction(value).catch(() => null);
            if (request !== latest.current) return; // a newer value is being checked
            setStatus(result ? (result.available ? "available" : (result.reason ?? "invalid")) : "idle");
        }, DELAY_MS);
    }

    // A failed save brings back a changed slug: check it again.
    useEffect(() => {
        if (defaultValue !== savedSlug) schedule(defaultValue);
        return () => clearTimeout(timer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount (the form remounts the field)
    }, []);

    const Icon = status === "checking" ? Loader2 : status === "available" ? Check : X;

    return (
        <>
            <div className="flex items-center overflow-hidden rounded-xl border border-line-strong bg-white transition-colors focus-within:border-accent focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-accent has-[[aria-invalid=true]]:border-status-red-strong">
                <span className="shrink-0 py-2.75 pl-3.5 text-sm text-stone-500" aria-hidden>
                    kennelos.com/kennel/
                </span>
                <input
                    {...control}
                    aria-describedby={[control["aria-describedby"], changed ? `${control.id}-warning` : null].filter(Boolean).join(" ") || undefined}
                    name={name}
                    defaultValue={defaultValue}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={(event) => {
                        const value = event.target.value.trim();
                        setChanged(value !== savedSlug);
                        if (value === savedSlug) {
                            clearTimeout(timer.current);
                            latest.current++;
                            setStatus("idle");
                        } else {
                            setStatus("checking");
                            schedule(value);
                        }
                    }}
                    className="min-w-0 flex-1 border-0 bg-transparent py-2.75 pr-2 pl-0.5 text-sm text-stone-900 outline-none"
                />
                {/* The visible status; the sentence below is what screen readers hear. */}
                {status !== "idle" && (
                    <span aria-hidden className={`flex shrink-0 items-center gap-1 pr-3.5 text-xs font-semibold whitespace-nowrap ${STATUS_CLASSES[status]}`}>
                        <Icon className={`size-3.5 ${status === "checking" ? "animate-spin" : ""}`} />
                        {t(`short.${status}`)}
                    </span>
                )}
            </div>
            <p role="status" aria-live="polite" className="sr-only">
                {status !== "idle" && status !== "checking" ? t(`long.${status}`) : ""}
            </p>
            {status !== "idle" && status !== "checking" && status !== "available" && (
                <p className="mt-1.5 text-xs text-status-red" aria-hidden>
                    {t(`long.${status}`)}
                </p>
            )}
            {changed && (
                <p id={`${control.id}-warning`} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-status-amber">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
                    {t("breaksLinks")}
                </p>
            )}
        </>
    );
}
