"use client";

import type { FieldControlProps } from "./Field";

export type SegmentedOption = { value: string; label: string };

/**
 * Segmented choice built on native radio inputs (visually hidden), so it
 * submits with FormData, supports arrow keys and works before hydration.
 * Pass `value` + `onValueChange` to control it, or `defaultValue` to leave it
 * uncontrolled. Wrap it in <Field as="fieldset"> for the group label.
 */
export default function SegmentedControl({
    name,
    options,
    value,
    defaultValue,
    onValueChange,
    control,
}: {
    name: string;
    options: SegmentedOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    /** From Field: the first radio gets the id so errors can focus it. */
    control?: FieldControlProps;
}) {
    return (
        <div
            role="radiogroup"
            aria-invalid={control?.["aria-invalid"]}
            aria-describedby={control?.["aria-describedby"]}
            className="flex overflow-hidden rounded-xl border border-line-strong bg-white aria-invalid:border-status-red-strong"
        >
            {options.map((option, index) => (
                <label key={option.value} className="relative flex-1 border-l border-line-strong first:border-l-0">
                    <input
                        type="radio"
                        name={name}
                        value={option.value}
                        {...(value !== undefined ? { checked: value === option.value } : { defaultChecked: defaultValue === option.value })}
                        onChange={(event) => event.target.checked && onValueChange?.(option.value)}
                        id={index === 0 ? control?.id : undefined}
                        // Lets the form move focus here when this group has an error.
                        data-error-focus={index === 0 && control?.["aria-invalid"] ? "" : undefined}
                        className="peer sr-only"
                    />
                    <span className="block cursor-pointer px-3 py-2.75 text-center text-sm text-stone-600 transition-colors peer-checked:bg-accent-soft peer-checked:font-semibold peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-accent hover:bg-stone-50 peer-checked:hover:bg-accent-soft">
                        {option.label}
                    </span>
                </label>
            ))}
        </div>
    );
}
