"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { changeDogStatusAction } from "@/app/[locale]/dashboard/dogs/actions";
import type { DogStatus } from "@/lib/dashboard/types";
import { STATUS_ORDER, STATUS_PILL } from "./dogMeta";

const GAP = 6;
const EDGE = 8;

/**
 * Status pill that opens a menu of the four statuses. The menu is portalled
 * to <body> with fixed positioning, so the card/grid can't clip it, and flips
 * above the pill near the bottom of the viewport.
 */
export default function StatusMenu({ dogId, dogName, status }: { dogId: string; dogName: string; status: DogStatus }) {
    const t = useTranslations("dashboard");
    const router = useRouter();
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const [focusIndex, setFocusIndex] = useState(0);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [failed, setFailed] = useState(false);
    const [pending, startTransition] = useTransition();
    const [shownStatus, setOptimisticStatus] = useOptimistic(status);
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
        setFocusIndex(Math.max(0, STATUS_ORDER.indexOf(shownStatus)));
        setFailed(false);
        setOpen(true);
    }

    function choose(next: DogStatus) {
        close(true);
        if (next === shownStatus) return;
        startTransition(async () => {
            setOptimisticStatus(next);
            const result = await changeDogStatusAction(dogId, next);
            if (!result.ok) setFailed(true);
            router.refresh();
        });
    }

    function onMenuKeyDown(event: React.KeyboardEvent) {
        const last = STATUS_ORDER.length - 1;
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
                aria-label={t("dogs.list.changeStatus", { name: dogName, status: t(`common.dogStatus.${shownStatus}`) })}
                className={`flex items-center gap-1.5 rounded-full py-1.5 pr-2.5 pl-3 text-xs font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${STATUS_PILL[shownStatus]} ${pending ? "opacity-70" : ""}`}
            >
                {t(`common.dogStatus.${shownStatus}`)}
                {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <ChevronDown className="size-3" strokeWidth={2.5} aria-hidden />}
            </button>
            {failed && (
                <p role="alert" className="mt-1 text-xs font-medium text-status-red">
                    {t("dogs.list.statusFailed")}
                </p>
            )}

            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        id={menuId}
                        role="menu"
                        aria-label={t("dogs.list.statusMenuLabel", { name: dogName })}
                        onKeyDown={onMenuKeyDown}
                        style={{ top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? "visible" : "hidden" }}
                        className="fixed z-50 w-52 rounded-xl border border-line bg-white p-1.5 font-body shadow-md"
                    >
                        {STATUS_ORDER.map((option, index) => {
                            const current = option === shownStatus;
                            return (
                                <button
                                    key={option}
                                    ref={(node) => {
                                        itemRefs.current[index] = node;
                                    }}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={current}
                                    tabIndex={index === focusIndex ? 0 : -1}
                                    onClick={() => choose(option)}
                                    onMouseEnter={() => setFocusIndex(index)}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.25 text-left text-[13px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                                        current ? "bg-accent-soft font-semibold text-accent" : "text-stone-700 hover:bg-stone-50 focus:bg-stone-50"
                                    }`}
                                >
                                    {t(`common.dogStatusOption.${option}`)}
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
