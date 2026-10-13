"use client";

import { useEffect, type RefObject } from "react";

const INVALID = 'input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"], [data-error-focus]';

/**
 * After a failed submit (`status === "error"`, once per `submission`), move
 * focus to the first invalid control in the form, in page order.
 */
export function useFocusFirstError(formRef: RefObject<HTMLFormElement | null>, state: { status: string; submission: number }) {
    useEffect(() => {
        if (state.status !== "error") return;
        const target = formRef.current?.querySelector<HTMLElement>(INVALID);
        target?.focus();
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [formRef, state.status, state.submission]);
}
