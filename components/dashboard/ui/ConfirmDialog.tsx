"use client";

import type { ReactNode } from "react";
import Button from "./Button";
import Modal from "./Modal";

/** Yes/no confirmation in a Modal. Cancel gets initial focus. */
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
    return (
        <Modal open={open} title={title} description={description} onClose={onCancel} dismissible={!pending}>
            {error && <p className="mt-3 text-sm font-medium text-status-red">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
                <Button variant="secondary" onClick={onCancel} disabled={pending} autoFocus>
                    {cancelLabel}
                </Button>
                <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={pending} aria-busy={pending}>
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}
