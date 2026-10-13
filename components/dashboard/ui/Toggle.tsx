import type { ComponentProps, ReactNode } from "react";

/**
 * On/off switch (a native checkbox with role="switch"), with an inline label.
 * `stateLabels` also writes the state as text next to the switch ("Email" /
 * "Off"), so color is never the only signal. It's CSS-only (follows the
 * checkbox), and hidden from screen readers, which already announce on/off.
 */
export default function Toggle({
    label,
    description,
    stateLabels,
    className = "",
    ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode; stateLabels?: { on: string; off: string } }) {
    return (
        <label className={`flex cursor-pointer items-start justify-between gap-4 ${className}`}>
            <span className="min-w-0">
                <span className="block text-sm font-medium text-stone-900">{label}</span>
                {description && <span className="mt-0.5 block text-xs text-stone-500">{description}</span>}
            </span>
            {/* Every styled part is a sibling of the checkbox, so peer-checked: reaches it. The knob is placed from the right because the state text sits before the track. */}
            <span className="relative mt-0.5 inline-flex shrink-0 items-center gap-3">
                <input type="checkbox" role="switch" {...props} className="peer sr-only" />
                <span className="h-6 w-11 rounded-full bg-stone-300 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:opacity-50" />
                <span className="pointer-events-none absolute top-1/2 right-5.5 size-5 -translate-y-1/2 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                {stateLabels && (
                    <>
                        <span aria-hidden className="order-first hidden min-w-10 text-right text-xs text-stone-500 peer-checked:inline">
                            {stateLabels.on}
                        </span>
                        <span aria-hidden className="order-first min-w-10 text-right text-xs text-stone-500 peer-checked:hidden">
                            {stateLabels.off}
                        </span>
                    </>
                )}
            </span>
        </label>
    );
}
