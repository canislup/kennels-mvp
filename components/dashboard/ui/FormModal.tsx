"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/dashboard/types";
import Button from "./Button";
import Modal from "./Modal";

const INITIAL: ActionState = { status: "idle", fieldErrors: {}, submission: 0 };

/**
 * A Modal whose content is a form posted to a Server Action through
 * useActionState. The action returns an ActionState: "done" closes the
 * dialog (the action has already called refresh()), "error" keeps it open and
 * shows the field errors (translation keys) and the form error.
 *
 * Open it with its own trigger (`trigger`) or from outside (`open` +
 * `onOpenChange`, e.g. from a menu). Each opening starts with fresh fields
 * and no old errors. Focus returns to whatever opened it (native <dialog>).
 */
export default function FormModal({
    title,
    description,
    action,
    submitLabel,
    pendingLabel,
    cancelLabel,
    tone = "default",
    submitDisabled = false,
    trigger,
    open: controlledOpen,
    onOpenChange,
    onSuccess,
    children,
}: {
    title: ReactNode;
    description?: ReactNode;
    /** A Server Action, usually bound to the record id. */
    action: (state: ActionState, formData: FormData) => Promise<ActionState>;
    submitLabel: string;
    pendingLabel: string;
    cancelLabel: string;
    tone?: "default" | "danger";
    submitDisabled?: boolean;
    trigger?: (open: () => void) => ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Called once after the action reports success (e.g. to clear a selection). */
    onSuccess?: () => void;
    /** The fields. `error(name)` returns the translated error for that field, if any. */
    children: (ctx: { error: (field: string) => string | undefined; pending: boolean }) => ReactNode;
}) {
    const t = useTranslations("dashboard.common.errors");
    const [state, formAction, pending] = useActionState(action, INITIAL);
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = (next: boolean) => (onOpenChange ? onOpenChange(next) : setInternalOpen(next));
    const formRef = useRef<HTMLFormElement>(null);

    // Results belong to the opening they were submitted in.
    const [openedAt, setOpenedAt] = useState({ submission: state.submission, count: 0 });
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setOpenedAt({ submission: state.submission, count: openedAt.count + 1 });
    }
    const current = state.submission > openedAt.submission;

    // Close once the action reports success.
    const [handled, setHandled] = useState(state.submission);
    if (handled !== state.submission) {
        setHandled(state.submission);
        if (state.status === "done" && open) {
            setOpen(false);
            onSuccess?.();
        }
    }

    useEffect(() => {
        if (state.status === "error" && current) formRef.current?.querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"], [data-error-focus]')?.focus();
    }, [state, current]);

    const error = (field: string) => {
        const fieldError = current ? state.fieldErrors[field] : undefined;
        return fieldError ? t(fieldError.key, fieldError.params) : undefined;
    };
    const formError = current && state.formError ? t(state.formError.key, state.formError.params) : null;

    return (
        <>
            {trigger?.(() => setOpen(true))}
            <Modal open={open} title={title} description={description} onClose={() => setOpen(false)} dismissible={!pending}>
                <form key={openedAt.count} ref={formRef} action={formAction} noValidate className="mt-4">
                    {children({ error, pending })}
                    {formError && (
                        <p role="alert" className="mt-3 text-sm font-medium text-status-red">
                            {formError}
                        </p>
                    )}
                    <div className="mt-6 flex flex-wrap justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                            {cancelLabel}
                        </Button>
                        <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} disabled={pending || submitDisabled} aria-busy={pending}>
                            {pending ? pendingLabel : submitLabel}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
