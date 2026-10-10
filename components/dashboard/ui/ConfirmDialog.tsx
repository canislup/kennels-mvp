"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import Button from "./Button";

/**
 * Modal confirmation on the native <dialog> element: showModal() makes the
 * page behind it inert (focus stays inside), Escape cancels, and focus goes
 * back to the trigger when it closes. Clicking the backdrop cancels too.
 */
export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    tone = "default",
    pending = false,
    error,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: ReactNode;
    description: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    tone?: "default" | "danger";
    pending?: boolean;
    error?: ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
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
            aria-describedby={descriptionId}
            onCancel={(event) => {
                event.preventDefault(); // let React state close it
                if (!pending) onCancel();
            }}
            onClick={(event) => event.target === ref.current && !pending && onCancel()}
            className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-0 text-stone-900 shadow-md backdrop:bg-stone-900/40"
        >
            <div className="p-6">
                <h2 id={titleId} className="font-display text-xl font-bold">
                    {title}
                </h2>
                <div id={descriptionId} className="mt-2 text-sm text-stone-600">
                    {description}
                </div>
                {error && <p className="mt-3 text-sm font-medium text-status-red">{error}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-2.5">
                    <Button variant="secondary" onClick={onCancel} disabled={pending} autoFocus>
                        {cancelLabel}
                    </Button>
                    <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={pending} aria-busy={pending}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </dialog>
    );
}
