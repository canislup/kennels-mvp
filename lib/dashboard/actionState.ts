// REAL LOGIC (not a mock), server only: helpers for Server Actions that return
// an ActionState (FormModal, inline forms). See CLAUDE.md "Dialogs that submit".
import { refresh } from "next/cache";
import type { ActionState, FieldError, SimpleMutationResult } from "./types";

export function failed(previous: ActionState, fieldErrors: Record<string, FieldError>, formError?: FieldError): ActionState {
    return { status: "error", fieldErrors, formError, submission: previous.submission + 1 };
}

/** "done" after refresh() (the page comes back updated in the same round trip), or the mutation's errors. */
export function fromResult(previous: ActionState, result: SimpleMutationResult): ActionState {
    if (!result.ok) return failed(previous, result.fieldErrors as Record<string, FieldError>, result.formError);
    refresh();
    return { status: "done", fieldErrors: {}, submission: previous.submission + 1 };
}
