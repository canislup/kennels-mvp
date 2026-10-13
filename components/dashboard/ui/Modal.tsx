"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Modal on the native <dialog> element. showModal() makes the page behind it
 * inert (focus is trapped inside), Escape and a backdrop click call
 * `onClose`, and the browser returns focus to the trigger on close.
 */
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
