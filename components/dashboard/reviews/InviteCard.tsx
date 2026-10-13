"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createInviteAction, type InviteFormState } from "@/app/[locale]/dashboard/reviews/actions";
import Button from "@/components/dashboard/ui/Button";
import TextInput from "@/components/dashboard/ui/TextInput";
import { useFocusFirstError } from "@/components/dashboard/ui/useFocusFirstError";
import CopyLink from "./CopyLink";

const INITIAL: InviteFormState = { status: "idle", fieldErrors: {}, submission: 0 };

/**
 * "Ask a past buyer": one form, two submit buttons. "Send" (intent=send) uses
 * the optional email; "Copy invite link instead" (intent=link) ignores it.
 * Either way the result panel shows the link to copy, because no email is
 * sent in this version (and the panel says so).
 */
export default function InviteCard() {
    const t = useTranslations("dashboard");
    const [state, formAction, pending] = useActionState(createInviteAction, INITIAL);
    const formRef = useRef<HTMLFormElement>(null);
    useFocusFirstError(formRef, state);
    const error = state.fieldErrors.email;

    // Not <Card>: the accent border replaces the card border (white fill, per the dashboard style).
    return (
        <section aria-labelledby="invite-heading" className="min-w-0 flex-[1_1_320px] rounded-2xl border border-accent bg-white p-6">
            <h2 id="invite-heading" className="mb-2 font-display text-xl font-bold">
                {t("reviews.invite.heading")}
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-stone-700">{t("reviews.invite.description")}</p>
            <form ref={formRef} action={formAction} noValidate>
                <label htmlFor="invite-email" className="sr-only">
                    {t("reviews.invite.emailLabel")}
                </label>
                <div className="mb-2.5 flex gap-2">
                    <TextInput
                        key={state.submission}
                        id="invite-email"
                        name="email"
                        type="email"
                        autoComplete="off"
                        defaultValue={state.values?.email ?? ""}
                        placeholder={t("reviews.invite.emailPlaceholder")}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? "invite-email-error" : undefined}
                        className="min-w-0 flex-1"
                    />
                    <Button type="submit" name="intent" value="send" disabled={pending} aria-busy={pending} className="shrink-0">
                        {t("reviews.invite.send")}
                    </Button>
                </div>
                {error && (
                    <p id="invite-email-error" className="mb-2.5 text-xs font-medium text-status-red">
                        {t(`common.errors.${error.key}`, error.params)}
                    </p>
                )}
                <button
                    type="submit"
                    name="intent"
                    value="link"
                    disabled={pending}
                    className="rounded text-[13px] font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                >
                    {t("reviews.invite.copyInstead")}
                </button>
            </form>

            <div aria-live="polite">
                {state.status === "done" && state.invite && (
                    <div className="mt-5 border-t border-line pt-4">
                        <p className="mb-3 text-[13px] leading-relaxed text-stone-700">
                            {state.invite.email ? t("reviews.invite.createdFor", { email: state.invite.email }) : t("reviews.invite.createdLink")}
                        </p>
                        <CopyLink key={state.submission} id="invite-link" path={state.invite.url} label={t("reviews.invite.linkLabel")} />
                        <p className="text-xs text-stone-500">{t("reviews.invite.pageNotLive")}</p>
                    </div>
                )}
            </div>
        </section>
    );
}
