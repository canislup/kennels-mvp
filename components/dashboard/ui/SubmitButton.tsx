"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import Button from "./Button";

/**
 * Submit button for a plain `<form action={serverAction}>` (no useActionState):
 * shows `pendingLabel` and disables itself while the enclosing form submits.
 */
export default function SubmitButton({
    pendingLabel,
    children,
    ...props
}: Omit<Extract<ComponentProps<typeof Button>, { href?: undefined }>, "type"> & { pendingLabel: string }) {
    const { pending } = useFormStatus();
    return (
        <Button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending}>
            {pending ? pendingLabel : children}
        </Button>
    );
}
