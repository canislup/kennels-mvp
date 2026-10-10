import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

/** Props to spread on the control so it's labelled and announces help/errors. */
export type FieldControlProps = {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
};

/**
 * Label + control + help text + error. The control is a render prop so it
 * gets the right id / aria-describedby / aria-invalid. Use `as="fieldset"` for
 * groups (segmented controls), which get a <legend> instead of a <label>.
 */
export default function Field({
    id,
    label,
    help,
    error,
    as = "div",
    className = "",
    children,
}: {
    id: string;
    label: ReactNode;
    help?: ReactNode;
    /** Already-translated error message. */
    error?: string;
    as?: "div" | "fieldset";
    className?: string;
    children: (control: FieldControlProps) => ReactNode;
}) {
    const helpId = help ? `${id}-help` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;
    const control: FieldControlProps = { id, "aria-describedby": describedBy, ...(error ? { "aria-invalid": true as const } : {}) };
    const labelClasses = "mb-1.5 block text-[13px] font-semibold text-stone-700";

    const body = (
        <>
            {children(control)}
            {error && (
                <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-status-red">
                    <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
                    {error}
                </p>
            )}
            {help && (
                <p id={helpId} className="mt-1.5 text-xs text-stone-500">
                    {help}
                </p>
            )}
        </>
    );

    if (as === "fieldset") {
        return (
            <fieldset className={`min-w-0 ${className}`} aria-describedby={describedBy} data-field={id}>
                <legend className={labelClasses}>{label}</legend>
                {body}
            </fieldset>
        );
    }
    return (
        <div className={`min-w-0 ${className}`} data-field={id}>
            <label htmlFor={id} className={labelClasses}>
                {label}
            </label>
            {body}
        </div>
    );
}
