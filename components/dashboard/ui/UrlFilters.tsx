"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import Select from "./Select";
import TextInput from "./TextInput";

const DEBOUNCE_MS = 300;

export type UrlFilterSelect = {
    /** Search param it controls, e.g. "breed". */
    param: string;
    label: string; // accessible name
    allLabel: string; // the empty option ("All breeds")
    options: { value: string; label: string }[];
    className?: string;
    /** Params cleared when this one changes (e.g. breed clears dog). */
    resets?: string[];
};

/**
 * Search box + selects whose state lives in the URL. Each change updates its
 * param, keeps the others, and drops `page`. Search is debounced and replaces
 * the history entry; selects push one, so back/forward step through them.
 * Used by Dogs and Leads.
 */
export default function UrlFilters({
    searchLabel,
    searchPlaceholder,
    selects,
    children,
    after,
    className = "mb-6",
}: {
    /** Omit both to render no search box. */
    searchLabel?: string;
    searchPlaceholder?: string;
    selects: UrlFilterSelect[];
    /** Extra controls rendered before the search box (e.g. a view toggle). */
    children?: React.ReactNode;
    /** Extra controls rendered after the selects. */
    after?: React.ReactNode;
    className?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const q = searchParams.get("q") ?? "";

    function update(key: string, value: string, mode: "push" | "replace", resets: string[] = []) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        for (const reset of resets) params.delete(reset);
        params.delete("page");
        params.delete("notice");
        const query = params.toString();
        router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false });
    }

    // Keep the box in sync when the URL changes from outside (back/forward, "Clear filters").
    useEffect(() => {
        const input = inputRef.current;
        if (input && document.activeElement !== input && input.value !== q) input.value = q;
    }, [q]);

    useEffect(() => () => clearTimeout(timer.current), []);

    return (
        <div className={`flex flex-wrap items-center gap-3 ${className}`}>
            {children}
            {searchLabel && (
            <div className="relative min-w-0 flex-[1_1_240px]">
                <label htmlFor="url-filter-search" className="sr-only">
                    {searchLabel}
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-500" aria-hidden />
                <TextInput
                    ref={inputRef}
                    id="url-filter-search"
                    type="search"
                    defaultValue={q}
                    placeholder={searchPlaceholder}
                    className="pl-9.5"
                    onChange={(event) => {
                        const value = event.target.value.trim();
                        clearTimeout(timer.current);
                        timer.current = setTimeout(() => update("q", value, "replace"), DEBOUNCE_MS);
                    }}
                />
            </div>
            )}
            {selects.map((select) => (
                <Select
                    key={select.param}
                    aria-label={select.label}
                    value={searchParams.get(select.param) ?? ""}
                    onChange={(event) => update(select.param, event.target.value, "push", select.resets)}
                    className={select.className ?? "flex-[1_1_150px] sm:flex-none"}
                >
                    <option value="">{select.allLabel}</option>
                    {select.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            ))}
            {after}
        </div>
    );
}
