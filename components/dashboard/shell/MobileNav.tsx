"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { usePathname } from "@/i18n/navigation";

const DRAWER_ID = "dashboard-mobile-drawer";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Hamburger + off-canvas drawer below `lg`. `children` is the server-rendered
 * sidebar. Closes on route change, Escape, backdrop click, any link click
 * inside it, and when the viewport grows to `lg`. Traps focus while open and
 * returns it to the hamburger on close.
 */
export default function MobileNav({ children }: { children: ReactNode }) {
    const t = useTranslations("dashboard.shell.mobileNav");
    const pathname = usePathname();
    // The drawer is open only for the path it was opened on, so navigating
    // closes it without a setState-in-effect.
    const [openOnPath, setOpenOnPath] = useState<string | null>(null);
    // Forget a stale path so returning to it later (e.g. browser back) doesn't reopen the drawer.
    if (openOnPath !== null && openOnPath !== pathname) setOpenOnPath(null);
    const open = openOnPath !== null && openOnPath === pathname;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const wasOpen = useRef(false);

    const close = useCallback(() => setOpenOnPath(null), []);

    // Focus management + body scroll lock.
    useEffect(() => {
        if (open) {
            wasOpen.current = true;
            const previousOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
            return () => {
                document.body.style.overflow = previousOverflow;
            };
        }
        if (wasOpen.current) {
            wasOpen.current = false;
            triggerRef.current?.focus();
        }
    }, [open]);

    // Escape + focus trap.
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                close();
                return;
            }
            if (event.key !== "Tab" || !panelRef.current) return;
            const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
            if (focusable.length === 0) return;
            const first = focusable[0]!;
            const last = focusable[focusable.length - 1]!;
            const active = document.activeElement;
            if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
                event.preventDefault();
                first.focus();
            }
        };
        // The drawer is lg:hidden; don't leave it open (and the body locked) on resize.
        const desktop = window.matchMedia("(min-width: 64rem)");
        const onResize = () => desktop.matches && close();
        document.addEventListener("keydown", onKeyDown);
        desktop.addEventListener("change", onResize);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            desktop.removeEventListener("change", onResize);
        };
    }, [open, close]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpenOnPath(pathname)}
                aria-expanded={open}
                aria-controls={DRAWER_ID}
                aria-label={t("open")}
                className="flex size-10 items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
            >
                <Menu className="size-5" strokeWidth={1.8} aria-hidden />
            </button>

            <div id={DRAWER_ID} className={open ? "fixed inset-0 z-50 lg:hidden" : "hidden"}>
                {open && (
                    <>
                        <div className="absolute inset-0 bg-stone-900/40" onClick={close} aria-hidden />
                        <div
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label={t("label")}
                            // Close after following any link (including the current page's).
                            onClick={(event) => (event.target as HTMLElement).closest("a") && close()}
                            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-md"
                        >
                            <button
                                type="button"
                                onClick={close}
                                aria-label={t("close")}
                                className="absolute top-5 right-3 flex size-9 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                                <X className="size-5" strokeWidth={1.8} aria-hidden />
                            </button>
                            {children}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
