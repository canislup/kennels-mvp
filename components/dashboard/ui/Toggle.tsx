import type { ComponentProps, ReactNode } from "react";

/** On/off switch (a native checkbox with role="switch"), with an inline label. */
export default function Toggle({ label, description, className = "", ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode }) {
    return (
        <label className={`flex cursor-pointer items-start justify-between gap-4 ${className}`}>
            <span className="min-w-0">
                <span className="block text-sm font-medium text-stone-900">{label}</span>
                {description && <span className="mt-0.5 block text-xs text-stone-500">{description}</span>}
            </span>
            <span className="relative mt-0.5 inline-flex shrink-0">
                <input type="checkbox" role="switch" {...props} className="peer sr-only" />
                <span className="h-6 w-11 rounded-full bg-stone-300 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:opacity-50" />
                <span className="pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </span>
        </label>
    );
}
