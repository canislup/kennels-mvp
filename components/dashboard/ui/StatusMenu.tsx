"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { SimpleMutationResult } from "@/lib/dashboard/types";

const GAP = 6;
const EDGE = 8;

export type StatusMenuOption = { value: string; label: string };

/**
 * A trigger that opens a menu of statuses (dogs, litters). Choosing one calls
 * `action` (a Server Action, usually bound to the record id), shows the new
 * value optimistically, then refreshes the route.
 *
 * The menu is portalled to <body> with fixed positioning, so cards/grids
 * can't clip it, and flips above the trigger near the bottom of the viewport.
 * Arrow keys / Home / End move, Enter chooses, Escape closes (focus returns
 * to the trigger), outside click closes.
 *
 * All text comes in already translated, so this works for any record type.
 */
export default function StatusMenu({
    value,
    options,
    action,
    variant = "pill",
    pillLabels,
    pillClasses,
    triggerLabels,
    buttonText,
    menuLabel,
    failedMessage,
}: {
    value: string;
    /** Menu items, in order (long labels, e.g. "Available puppy"). */
    options: StatusMenuOption[];
    action: (value: string) => Promise<SimpleMutationResult>;
    /** "pill": the trigger is a colored pill showing the current value; "button": a secondary button with `buttonText`. */
    variant?: "pill" | "button";
    /** Short label per value shown on the pill (e.g. "Available"). */
    pillLabels?: Record<string, string>;
    /** Pill classes per value. */
    pillClasses?: Record<string, string>;
    /** Accessible name of the trigger per current value, e.g. "Change status of Mocha, currently Reserved". */
    triggerLabels: Record<string, string>;
    buttonText?: string;
    menuLabel: string;
    failedMessage: string;
}) {
    const router = useRouter();
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const [focusIndex, setFocusIndex] = useState(0);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [failed, setFailed] = useState(false);
    const [pending, startTransition] = useTransition();
    const [shownStatus, setOptimisticStatus] = useOptimistic(value);
    const values = options.map((option) => option.value);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const close = useCallback((returnFocus: boolean) => {
        setOpen(false);
        setPosition(null);
        if (returnFocus) buttonRef.current?.focus();
    }, []);

    const place = useCallback(() => {
        const button = buttonRef.current;
        const menu = menuRef.current;
        if (!button || !menu) return;
        const rect = button.getBoundingClientRect();
        const { offsetHeight: height, offsetWidth: width } = menu;
        const below = rect.bottom + GAP;
        const top = below + height > window.innerHeight - EDGE ? Math.max(EDGE, rect.top - GAP - height) : below;
        const left = Math.min(Math.max(EDGE, rect.left), window.innerWidth - width - EDGE);
        setPosition({ top, left });
    }, []);

    // Position before paint, then focus the highlighted item.
    useLayoutEffect(() => {
        if (open) place();
    }, [open, place]);
    useEffect(() => {
        if (open && position) itemRefs.current[focusIndex]?.focus();
    }, [open, position, focusIndex]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
        };
    }, [open, close, place]);

    function openMenu() {
        setFocusIndex(Math.max(0, values.indexOf(shownStatus)));
        setFailed(false);
        setOpen(true);
    }

    function choose(next: string) {
        close(true);
        if (next === shownStatus) return;
        startTransition(async () => {
            setOptimisticStatus(next);
            const result = await action(next);
            if (!result.ok) setFailed(true);
            router.refresh();
        });
    }

    function onMenuKeyDown(event: React.KeyboardEvent) {
        const last = values.length - 1;
        const moves: Record<string, number> = {
            ArrowDown: focusIndex === last ? 0 : focusIndex + 1,
            ArrowUp: focusIndex === 0 ? last : focusIndex - 1,
            Home: 0,
            End: last,
        };
        if (event.key in moves) {
            event.preventDefault();
            setFocusIndex(moves[event.key]!);
        } else if (event.key === "Escape") {
            event.preventDefault();
            close(true);
        } else if (event.key === "Tab") {
            close(false);
        }
    }

    return (
        <div className="min-w-0">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => (open ? close(false) : openMenu())}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        event.preventDefault();
                        openMenu();
                    }
                }}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-busy={pending}
                aria-label={triggerLabels[shownStatus]}
                className={
                    variant === "pill"
                        ? `flex items-center gap-1.5 rounded-full py-1.5 pr-2.5 pl-3 text-xs font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${pillClasses?.[shownStatus] ?? ""} ${pending ? "opacity-70" : ""}`
                        : "flex items-center gap-2 rounded-xl border border-accent-soft bg-accent-soft px-4 py-2.25 text-[13px] font-semibold whitespace-nowrap text-accent transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                }
            >
                {variant === "pill" ? pillLabels?.[shownStatus] : buttonText}
                {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <ChevronDown className="size-3" strokeWidth={2.5} aria-hidden />}
            </button>
            {failed && (
                <p role="alert" className="mt-1 text-xs font-medium text-status-red">
                    {failedMessage}
                </p>
            )}

            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        id={menuId}
                        role="menu"
                        aria-label={menuLabel}
                        onKeyDown={onMenuKeyDown}
                        style={{ top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? "visible" : "hidden" }}
                        className="fixed z-50 w-52 rounded-xl border border-line bg-white p-1.5 font-body shadow-md"
                    >
                        {options.map((option, index) => {
                            const current = option.value === shownStatus;
                            return (
                                <button
                                    key={option.value}
                                    ref={(node) => {
                                        itemRefs.current[index] = node;
                                    }}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={current}
                                    tabIndex={index === focusIndex ? 0 : -1}
                                    onClick={() => choose(option.value)}
                                    onMouseEnter={() => setFocusIndex(index)}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.25 text-left text-[13px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                                        current ? "bg-accent-soft font-semibold text-accent" : "text-stone-700 hover:bg-stone-50 focus:bg-stone-50"
                                    }`}
                                >
                                    {option.label}
                                    {current && <Check className="size-3.5" aria-hidden />}
                                </button>
                            );
                        })}
                    </div>,
                    document.body,
                )}
        </div>
    );
}
