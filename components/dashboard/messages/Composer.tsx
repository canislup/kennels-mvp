"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PawPrint } from "lucide-react";
import { sendMessageAction, shareDogAction } from "@/app/[locale]/dashboard/messages/actions";
import type { ActionState, ShareableDog } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import FormModal from "@/components/dashboard/ui/FormModal";
import Textarea from "@/components/dashboard/ui/Textarea";

const MESSAGE_MAX = 2000;

/**
 * Reply box: Enter adds a new line, Cmd/Ctrl+Enter sends. Cleared and
 * refocused after a successful send; an empty message shows an inline error.
 * "Share a dog" sends a dog-only message from a dialog.
 */
export default function Composer({ conversationId, firstName, dogs }: { conversationId: string; firstName: string; dogs: ShareableDog[] }) {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState<ActionState, FormData>(sendMessageAction.bind(null, conversationId), { status: "idle", fieldErrors: {}, submission: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [sent, setSent] = useState(0);
    const [seen, setSeen] = useState(state.submission);
    if (seen !== state.submission) {
        setSeen(state.submission);
        if (state.status === "done") setSent(sent + 1);
    }
    // Focus the (new, empty) box after a send, or the box with the error.
    useEffect(() => {
        if (state.submission > 0) textareaRef.current?.focus();
    }, [state.submission, sent]);

    const error = state.status === "error" ? state.fieldErrors.body : undefined;

    return (
        <div className="border-t border-line bg-white px-4 py-4 sm:px-6">
            <form id="message-reply-form" action={formAction} noValidate>
                <label htmlFor="message-reply" className="sr-only">
                    {t("messages.composer.label", { name: firstName })}
                </label>
                <Textarea
                    key={sent}
                    ref={textareaRef}
                    id="message-reply"
                    name="body"
                    rows={3}
                    maxLength={MESSAGE_MAX}
                    placeholder={t("messages.composer.placeholder", { name: firstName })}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "message-reply-error" : "message-reply-hint"}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                        }
                    }}
                    className="resize-none"
                />
                <p id="message-reply-error" role="alert" className="text-xs font-medium text-status-red">
                    {error && t(`common.errors.${error.key}`, error.params)}
                </p>
            </form>
            {/* Outside the reply form: the share dialog has its own form, and forms can't nest. */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <ShareDog conversationId={conversationId} dogs={dogs} />
                <span id="message-reply-hint" className="hidden text-xs text-stone-500 sm:inline">
                    {t("messages.composer.hint")}
                </span>
                <Button type="submit" form="message-reply-form" disabled={pending} aria-busy={pending} className="px-5.5">
                    {pending ? t("messages.composer.sending") : t("messages.composer.send")}
                </Button>
            </div>
        </div>
    );
}

function ShareDog({ conversationId, dogs }: { conversationId: string; dogs: ShareableDog[] }) {
    const t = useTranslations("dashboard");
    return (
        <FormModal
            title={t("messages.share.title")}
            description={dogs.length > 0 ? t("messages.share.description") : t("messages.share.none")}
            action={shareDogAction.bind(null, conversationId)}
            submitLabel={t("messages.share.submit")}
            pendingLabel={t("messages.share.pending")}
            cancelLabel={t("messages.share.cancel")}
            submitDisabled={dogs.length === 0}
            trigger={(open) => (
                <Button variant="secondary" onClick={open} className="px-3 py-2 text-[13px] font-medium">
                    <PawPrint className="size-4" aria-hidden />
                    {t("messages.share.button")}
                </Button>
            )}
        >
            {({ error }) =>
                dogs.length > 0 && (
                    <>
                        <ul role="radiogroup" aria-label={t("messages.share.pick")} aria-invalid={error("dogId") ? true : undefined} className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                            {dogs.map((dog, index) => (
                                <li key={dog.id}>
                                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-stone-50 has-checked:bg-accent-soft">
                                        <input type="radio" name="dogId" value={dog.id} className="size-4 accent-accent" data-error-focus={index === 0 && error("dogId") ? "" : undefined} />
                                        <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-linear-135 from-sand-light to-sand-dark">
                                            {dog.coverPhotoUrl && <img src={dog.coverPhotoUrl} alt="" className="h-full w-full object-cover" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-stone-900">{dog.name}</span>
                                            <span className="block truncate text-xs text-stone-500">
                                                {[dog.breed, t(`common.sex.${dog.sex}`), t(`common.dogStatus.${dog.status}`)].join(" · ")}
                                            </span>
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                        {error("dogId") && <p className="mt-2 text-xs font-medium text-status-red">{error("dogId")}</p>}
                    </>
                )
            }
        </FormModal>
    );
}
