"use server";

// Server Actions for the Messages inbox. Each resolves the signed-in kennel
// and validates on the server; the data layer checks again that the
// conversation, lead and any shared dog belong to the kennel.
import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { LEAD_STAGES, moveLeadStage } from "@/lib/dashboard/leads";
import { getShareableDogs, markConversationRead, MESSAGE_MAX, sendMessage, startConversation } from "@/lib/dashboard/messages";
import { failed, fromResult } from "@/lib/dashboard/actionState";
import type { ActionState, BoardStage, SimpleMutationResult } from "@/lib/dashboard/types";

async function requireKennelId(): Promise<string> {
    const kennel = await getCurrentKennel();
    if (!kennel) redirect({ href: "/login", locale: await getLocale() });
    return kennel!.id;
}

const text = (formData: FormData, key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
};

/** Composer: a text reply. */
export async function sendMessageAction(conversationId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const body = text(formData, "body");
    if (!body) return failed(previous, { body: { key: "messageRequired" } });
    if (body.length > MESSAGE_MAX) return failed(previous, { body: { key: "tooLong", params: { max: MESSAGE_MAX } } });
    return fromResult(previous, await sendMessage(kennelId, conversationId, { body }));
}

/** "Share a dog": a dog-only message. */
export async function shareDogAction(conversationId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
    const kennelId = await requireKennelId();
    const dogId = text(formData, "dogId");
    if (!dogId) return failed(previous, { dogId: { key: "chooseDog" } });
    if (!(await getShareableDogs(kennelId)).some((dog) => dog.id === dogId)) return failed(previous, { dogId: { key: "invalidChoice" } });
    return fromResult(previous, await sendMessage(kennelId, conversationId, { body: "", sharedDogId: dogId }));
}

/** Called by the mark-read island once the thread is on screen. */
export async function markReadAction(conversationId: string): Promise<SimpleMutationResult> {
    const kennelId = await requireKennelId();
    const result = await markConversationRead(kennelId, conversationId);
    if (result.ok) refresh();
    return result;
}

/** "Start a conversation with {name}" (from ?lead=). Redirects to the new or existing thread. */
export async function startConversationAction(leadId: string): Promise<void> {
    const kennelId = await requireKennelId();
    const result = await startConversation(kennelId, leadId);
    const locale = await getLocale();
    if (!result.ok) redirect({ href: "/dashboard/messages", locale });
    else redirect({ href: `/dashboard/messages?conversation=${encodeURIComponent(result.conversationId)}`, locale });
}

/** Lead panel "Move to {next stage}" (plain form action). */
export async function advanceLeadAction(leadId: string, stage: string): Promise<void> {
    const kennelId = await requireKennelId();
    if (!LEAD_STAGES.includes(stage as BoardStage)) return;
    const result = await moveLeadStage(kennelId, leadId, stage as BoardStage);
    if (result.ok) refresh();
}
