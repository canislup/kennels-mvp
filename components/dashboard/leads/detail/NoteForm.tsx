"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { addNoteAction } from "@/app/[locale]/dashboard/leads/actions";
import type { ActionState } from "@/lib/dashboard/types";
import { LEAD_NOTE_MAX } from "@/lib/dashboard/validation/lead";
import Button from "@/components/dashboard/ui/Button";
import Textarea from "@/components/dashboard/ui/Textarea";

/** "Add a private note": cleared after a successful save, error shown inline. */
export default function NoteForm({ leadId, firstName }: { leadId: string; firstName: string }) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState<ActionState, FormData>(addNoteAction.bind(null, leadId), { status: "idle", fieldErrors: {}, submission: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // A new empty textarea after each saved note; the typed text stays after an error.
    const [saved, setSaved] = useState(0);
    const [seen, setSeen] = useState(state.submission);
    if (seen !== state.submission) {
        setSeen(state.submission);
        if (state.status === "done") setSaved(saved + 1);
    }
    useEffect(() => {
        if (state.status === "error") textareaRef.current?.focus();
    }, [state]);

    const error = state.status === "error" ? state.fieldErrors.body : undefined;
    return (
        <form action={formAction} noValidate className="mb-5">
            <label htmlFor="lead-note" className="sr-only">
                {t("leads.detail.notes.label")}
            </label>
            <Textarea
                key={saved}
                ref={textareaRef}
                id="lead-note"
                name="body"
                rows={3}
                maxLength={LEAD_NOTE_MAX}
                placeholder={t("leads.detail.notes.placeholder", { name: firstName })}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "lead-note-error" : undefined}
            />
            <div className="mt-1 flex items-start justify-between gap-3">
                <p id="lead-note-error" role="alert" className="text-xs font-medium text-status-red">
                    {error && t(`common.errors.${error.key}`, error.params)}
                </p>
                <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending} className="shrink-0 px-4 py-2.25 text-[13px]">
                    {pending ? t("leads.detail.notes.saving") : t("leads.detail.notes.save")}
                </Button>
            </div>
        </form>
    );
}
