"use client";

import { useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { CONTROL_CLASSES } from "./formStyles";

/**
 * Textarea with a live "123 / 800" counter. `maxLength` here is a soft limit:
 * the counter turns red past it and the server rejects the value, but typing
 * isn't blocked (so pasted text isn't silently cut).
 */
export default function Textarea({
    maxLength,
    className = "",
    defaultValue,
    onChange,
    ...props
}: Omit<ComponentProps<"textarea">, "maxLength" | "value"> & { maxLength: number; defaultValue?: string }) {
    const t = useTranslations("dashboard.common.form");
    const [length, setLength] = useState(defaultValue?.length ?? 0);
    const counterId = `${props.id}-counter`;
    const over = length > maxLength;

    return (
        <>
            <textarea
                {...props}
                defaultValue={defaultValue}
                aria-describedby={[props["aria-describedby"], counterId].filter(Boolean).join(" ")}
                onChange={(event) => {
                    setLength(event.target.value.length);
                    onChange?.(event);
                }}
                // React resets uncontrolled fields after a form action; keep the counter in sync.
                ref={(node) => {
                    if (!node) return;
                    const form = node.form;
                    const sync = () => requestAnimationFrame(() => setLength(node.value.length));
                    form?.addEventListener("reset", sync);
                    return () => form?.removeEventListener("reset", sync);
                }}
                className={`${CONTROL_CLASSES} resize-y leading-relaxed ${className}`}
            />
            <p id={counterId} className={`mt-1.5 text-right text-xs ${over ? "font-semibold text-status-red" : "text-stone-500"}`}>
                {t("characterCount", { count: length, max: maxLength })}
            </p>
        </>
    );
}
