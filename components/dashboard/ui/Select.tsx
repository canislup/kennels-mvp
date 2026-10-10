import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { CONTROL_CLASSES } from "./formStyles";

/** Native <select> with the dashboard control styling. */
export default function Select({ className = "", children, ...props }: ComponentProps<"select">) {
    return (
        <div className={`relative ${className}`}>
            <select {...props} className={`${CONTROL_CLASSES} appearance-none pr-10`}>
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-stone-500" aria-hidden />
        </div>
    );
}
