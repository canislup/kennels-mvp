"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Modal on the native <dialog> element. showModal() makes the page behind it
 * inert, Escape and a backdrop click call `onClose`, and the browser returns
 * focus to the trigger on close. Tab and Shift+Tab wrap inside the dialog
 * (natively they would leave it for the browser's own controls).
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
export default function Modal({
    open,
    title,
    description,
    onClose,
    dismissible = true,
    children,
}: {
    open: boolean;
    title: ReactNode;
    description?: ReactNode;
    onClose: () => void;
    /** false while an action is pending: Escape and backdrop clicks are ignored. */
    dismissible?: boolean;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            onCancel={(event) => {
                event.preventDefault(); // React state closes it
                if (dismissible) onClose();
            }}
            onClick={(event) => event.target === ref.current && dismissible && onClose()}
            onKeyDown={(event) => {
                if (event.key !== "Tab" || !ref.current) return;
                const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
                if (items.length === 0) return;
                const first = items[0]!;
                const last = items[items.length - 1]!;
                if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }}
            className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-0 text-stone-900 shadow-md backdrop:bg-stone-900/40"
        >
            <div className="p-6">
                <h2 id={titleId} className="font-display text-xl font-bold">
                    {title}
                </h2>
                {description && (
                    <div id={descriptionId} className="mt-2 text-sm text-stone-600">
                        {description}
                    </div>
                )}
                {children}
            </div>
        </dialog>
    );
}
