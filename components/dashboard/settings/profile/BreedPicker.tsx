"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, AlertTriangle, Plus, X } from "lucide-react";
import type { KennelBreedOption, ProfileBreed } from "@/lib/dashboard/types";
import { notifyFormChange } from "@/components/dashboard/ui/SaveBar";

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Up to `max` breeds as removable chips, plus "Add a breed": a combobox over
 * every breed (type to filter, arrow keys, Enter, Escape). Submits one hidden
 * `breedIds` input per chip. Removing a saved breed that has dogs or litters
 * shows what happens to them.
 */
export default function BreedPicker({
    initialIds,
    savedBreeds,
    options,
    max,
    error,
}: {
    initialIds: string[];
    /** The saved breeds, with their dog and litter counts. */
    savedBreeds: ProfileBreed[];
    options: KennelBreedOption[];
    max: number;
    error?: string;
}) {
    const t = useTranslations("dashboard.settings.profile.breeds");
    const [ids, setIds] = useState(initialIds);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    // Where focus goes after the chips change (the element it was on may be gone).
    const [focusTarget, setFocusTarget] = useState<"add" | "input" | number | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const addRef = useRef<HTMLButtonElement>(null);
    const listId = useId();

    const names = useMemo(() => new Map(options.map((option) => [option.id, option.name])), [options]);
    const full = ids.length >= max;
    const matches = useMemo(() => {
        const q = fold(query.trim());
        return options.filter((option) => !ids.includes(option.id) && (!q || fold(option.name).includes(q)));
    }, [options, ids, query]);
    const activeIndex = Math.min(active, Math.max(matches.length - 1, 0));

    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        notifyFormChange(rootRef.current);
    }, [ids]);

    useEffect(() => {
        if (focusTarget === null) return;
        if (focusTarget === "add") addRef.current?.focus();
        else if (focusTarget === "input") inputRef.current?.focus();
        else rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-chip-remove]")[focusTarget]?.focus();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot request, cleared after use
        setFocusTarget(null);
    }, [focusTarget]);

    function close(focusAdd: boolean) {
        setOpen(false);
        setQuery("");
        setActive(0);
        if (focusAdd) setFocusTarget("add");
    }

    function pick(id: string) {
        const next = [...ids, id];
        setIds(next);
        setOpen(false);
        setQuery("");
        setActive(0);
        // At the limit the Add button is disabled, so focus the new chip's remove button.
        setFocusTarget(next.length >= max ? next.length - 1 : "add");
    }

    function remove(index: number) {
        const next = ids.filter((_, i) => i !== index);
        setIds(next);
        setFocusTarget(next.length === 0 ? "add" : Math.min(index, next.length - 1));
    }

    const removedWithData = savedBreeds.filter((breed) => !ids.includes(breed.id) && (breed.dogCount > 0 || breed.litterCount > 0));
    const describedBy = [error ? "profile-breeds-error" : null, "profile-breeds-count"].filter(Boolean).join(" ");

    return (
        <div ref={rootRef}>
            {ids.map((id) => (
                <input key={id} type="hidden" name="breedIds" value={id} />
            ))}
            <div className="flex flex-wrap items-center gap-2.5">
                <ul className="flex flex-wrap gap-2.5 empty:hidden" aria-label={t("chosenLabel")}>
                    {ids.map((id, index) => (
                        <li key={id} className="inline-flex items-center gap-2 rounded-full bg-accent-soft py-2 pr-2 pl-4 text-sm font-medium text-accent">
                            {names.get(id) ?? id}
                            <button
                                type="button"
                                data-chip-remove
                                onClick={() => remove(index)}
                                aria-label={t("remove", { name: names.get(id) ?? id })}
                                className="flex size-5.5 items-center justify-center rounded-full bg-accent/12 hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                            >
                                <X className="size-3.5" aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
                {!open && (
                    <button
                        ref={addRef}
                        type="button"
                        disabled={full}
                        onClick={() => {
                            setOpen(true);
                            setFocusTarget("input");
                        }}
                        aria-describedby={describedBy}
                        data-error-focus={error ? "" : undefined}
                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-stone-400 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 data-error-focus:border-status-red-strong"
                    >
                        <Plus className="size-4" aria-hidden />
                        {t("add")}
                    </button>
                )}
                <span id="profile-breeds-count" className="ml-auto text-xs text-stone-500">
                    {t("count", { count: ids.length, max })}
                </span>
            </div>

            {open && (
                <div className="relative mt-3 max-w-sm">
                    <label htmlFor="profile-breed-search" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                        {t("searchLabel")}
                    </label>
                    <input
                        ref={inputRef}
                        id="profile-breed-search"
                        type="text"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={matches.length > 0 ? `${listId}-${activeIndex}` : undefined}
                        autoComplete="off"
                        value={query}
                        placeholder={t("searchPlaceholder")}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActive(0);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "ArrowDown") {
                                event.preventDefault();
                                setActive(Math.min(activeIndex + 1, matches.length - 1));
                            } else if (event.key === "ArrowUp") {
                                event.preventDefault();
                                setActive(Math.max(activeIndex - 1, 0));
                            } else if (event.key === "Enter") {
                                // Never submit the form from here.
                                event.preventDefault();
                                const match = matches[activeIndex];
                                if (match) pick(match.id);
                            } else if (event.key === "Escape") {
                                event.preventDefault();
                                close(true);
                            }
                        }}
                        onBlur={(event) => {
                            if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) close(false);
                        }}
                        className="w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.75 text-sm text-stone-900 placeholder:text-stone-500 focus-visible:border-accent focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-accent"
                    />
                    <ul id={listId} role="listbox" aria-label={t("searchLabel")} className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-md">
                        {matches.length === 0 ? (
                            <li className="px-3.5 py-2.5 text-sm text-stone-500">{t("noMatches")}</li>
                        ) : (
                            matches.map((option, index) => (
                                <li
                                    key={option.id}
                                    id={`${listId}-${index}`}
                                    role="option"
                                    aria-selected={index === activeIndex}
                                    // Keep focus in the input so blur doesn't close the list before the click.
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => pick(option.id)}
                                    ref={(node) => {
                                        if (node && index === activeIndex) node.scrollIntoView({ block: "nearest" });
                                    }}
                                    className={`cursor-pointer px-3.5 py-2 text-sm ${index === activeIndex ? "bg-accent-soft text-accent" : "text-stone-900 hover:bg-stone-50"}`}
                                >
                                    {option.name}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}

            {full && <p className="mt-2.5 text-xs text-stone-500">{t("limitReached", { max })}</p>}
            {error && (
                <p id="profile-breeds-error" className="mt-2.5 flex items-start gap-1.5 text-xs font-medium text-status-red">
                    <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
                    {error}
                </p>
            )}
            <div aria-live="polite">
                {removedWithData.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                    {removedWithData.map((breed) => (
                        <li key={breed.id} className="flex items-start gap-2 rounded-xl bg-status-amber-bg px-3.5 py-2.5 text-[13px] text-status-amber">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                            {t("removeWarning", { name: breed.name, dogs: breed.dogCount, litters: breed.litterCount })}
                        </li>
                    ))}
                </ul>
                )}
            </div>
        </div>
    );
}
