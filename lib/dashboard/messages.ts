// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// The Messages inbox: conversations (one per lead), threads, sending, read
// state. Inbox only: sent messages are stored, NOT delivered to the buyer
// (no email relay in this version; see ENDPOINTS.md). Reads are called from
// Server Components; mutations from app/[locale]/dashboard/messages/actions.ts.
import { ageOf } from "./age";
import { getMockStore, snapshot } from "./mock/store";
import type {
    Conversation,
    ConversationListItem,
    ConversationThread,
    LeadEvent,
    Message,
    ShareableDog,
    SharedDogSummary,
    SimpleMutationResult,
    ThreadMessage,
    UnreadSummary,
} from "./types";

export const MESSAGE_MAX = 2000;

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const notFound = (): SimpleMutationResult => ({ ok: false, fieldErrors: {}, formError: { key: "notFound" } });

export const initialsOf = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
};

const messagesOf = (conversationId: string) =>
    getMockStore()
        .messages.filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

const isUnread = (m: Message) => m.direction === "INBOUND" && m.readAt === null;

/** The dog card shown for a shared dog (any dog of the kennel, archived ones too: it's history). */
function sharedDogSummary(dogId: string | null): SharedDogSummary | null {
    const dog = dogId ? getMockStore().dogs.find((d) => d.id === dogId) : undefined;
    return dog ? { id: dog.id, name: dog.name, breed: dog.breed, sex: dog.sex, ageParts: ageOf(dog.birthDate, new Date()), coverPhotoUrl: dog.photos[0] ?? null } : null;
}

/** Message + its shared dog, as the thread and the lead page show it. */
export function toThreadMessage(message: Message): ThreadMessage {
    return { ...message, sharedDog: sharedDogSummary(message.sharedDogId) };
}

// --- Reads ---------------------------------------------------------------------------

/** Conversations, newest message first. `q` matches the lead's name or any message text (accent-insensitive). */
export async function listConversations(kennelId: string, filters: { q?: string; unreadOnly?: boolean } = {}): Promise<ConversationListItem[]> {
    void kennelId;
    const store = getMockStore();
    const q = filters.q ? fold(filters.q.trim()) : "";
    const items = store.conversations.flatMap((conversation): ConversationListItem[] => {
        const lead = store.leads.find((l) => l.id === conversation.leadId);
        if (!lead) return [];
        const messages = messagesOf(conversation.id);
        const unreadCount = messages.filter(isUnread).length;
        if (filters.unreadOnly && unreadCount === 0) return [];
        if (q && !fold(lead.name).includes(q) && !messages.some((m) => fold(m.body).includes(q))) return [];
        const last = messages[messages.length - 1];
        const dog = last?.sharedDogId ? store.dogs.find((d) => d.id === last.sharedDogId) : undefined;
        return [
            {
                id: conversation.id,
                leadId: lead.id,
                leadName: lead.name,
                initials: initialsOf(lead.name),
                lastMessagePreview: !last
                    ? { kind: "none" }
                    : !last.body && dog
                      ? { kind: "dog", dogName: dog.name, direction: last.direction }
                      : { kind: "text", text: last.body, direction: last.direction },
                lastMessageAt: conversation.lastMessageAt,
                unreadCount,
            },
        ];
    });
    return snapshot(items.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)));
}

/** One conversation with the lead summary (side panel) and its messages, oldest first. */
export async function getConversationThread(kennelId: string, conversationId: string): Promise<ConversationThread | null> {
    void kennelId;
    const store = getMockStore();
    const conversation = store.conversations.find((c) => c.id === conversationId);
    const lead = conversation && store.leads.find((l) => l.id === conversation.leadId);
    if (!conversation || !lead) return null;
    const dog = lead.dogId ? store.dogs.find((d) => d.id === lead.dogId) : undefined;
    const litterName = (id: string | null) => (id ? (store.litters.find((l) => l.id === id)?.name ?? null) : null);
    return snapshot({
        conversation,
        lead: {
            id: lead.id,
            name: lead.name,
            stage: lead.stage,
            interestBreed: lead.interestBreed,
            interestNote: lead.interestNote,
            litterName: litterName(lead.litterId),
            dog: dog ? { id: dog.id, name: dog.name, litterName: litterName(dog.litterId) } : null,
            followUpAt: lead.followUpAt,
            email: lead.email,
            phone: lead.phone,
        },
        messages: messagesOf(conversation.id).map(toThreadMessage),
    });
}

export async function getConversationForLead(kennelId: string, leadId: string): Promise<{ conversationId: string } | null> {
    void kennelId;
    const conversation = getMockStore().conversations.find((c) => c.leadId === leadId);
    return conversation ? { conversationId: conversation.id } : null;
}

/** Dogs that can be shared in a message: non-archived, available puppies first, then by name. */
export async function getShareableDogs(kennelId: string): Promise<ShareableDog[]> {
    void kennelId;
    return snapshot(
        getMockStore()
            .dogs.filter((d) => d.archivedAt === null)
            .sort((a, b) => Number(b.status === "AVAILABLE_PUPPY") - Number(a.status === "AVAILABLE_PUPPY") || a.name.localeCompare(b.name))
            .map((d) => ({ id: d.id, name: d.name, breed: d.breed, sex: d.sex, status: d.status, coverPhotoUrl: d.photos[0] ?? null })),
    );
}

/** Conversations with an unread INBOUND message (sidebar badge, Overview), and the oldest unread one's time. */
export async function getUnreadSummary(kennelId: string): Promise<UnreadSummary> {
    void kennelId;
    const unread = getMockStore().messages.filter(isUnread);
    return snapshot({ unreadConversations: new Set(unread.map((m) => m.conversationId)).size, oldestUnreadAt: unread.map((m) => m.createdAt).sort()[0] ?? null });
}

// --- Mutations ---------------------------------------------------------------------------

/**
 * Stores an OUTBOUND message (not delivered anywhere in this version). Bumps
 * the conversation and the lead's activity. A lead still in New moves to
 * Contacted automatically (STAGE_CHANGED with auto: true).
 */
export async function sendMessage(kennelId: string, conversationId: string, input: { body: string; sharedDogId?: string | null }): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    const conversation = store.conversations.find((c) => c.id === conversationId);
    const lead = conversation && store.leads.find((l) => l.id === conversation.leadId);
    if (!conversation || !lead) return notFound();
    const body = input.body.trim();
    const sharedDogId = input.sharedDogId || null;
    if (sharedDogId && !store.dogs.some((d) => d.id === sharedDogId && d.archivedAt === null)) return { ok: false, fieldErrors: { sharedDogId: { key: "invalidChoice" } } };
    if (!body && !sharedDogId) return { ok: false, fieldErrors: { body: { key: "messageRequired" } } };
    if (body.length > MESSAGE_MAX) return { ok: false, fieldErrors: { body: { key: "tooLong", params: { max: MESSAGE_MAX } } } };

    const now = new Date().toISOString();
    store.messages.push({ id: `msg_${crypto.randomUUID()}`, conversationId, direction: "OUTBOUND", body, sharedDogId, createdAt: now, readAt: now });
    conversation.lastMessageAt = now;
    lead.lastActivityAt = now;
    if (lead.stage === "NEW") {
        store.leadEvents.push({ id: `evt_${crypto.randomUUID()}`, leadId: lead.id, type: "STAGE_CHANGED", params: { from: "NEW", to: "CONTACTED", auto: true }, createdAt: now } as LeadEvent);
        lead.stage = "CONTACTED";
    }
    return { ok: true };
}

/** Marks every unread INBOUND message of the conversation read. Idempotent. */
export async function markConversationRead(kennelId: string, conversationId: string): Promise<SimpleMutationResult> {
    void kennelId;
    const store = getMockStore();
    if (!store.conversations.some((c) => c.id === conversationId)) return notFound();
    const now = new Date().toISOString();
    for (const m of store.messages) if (m.conversationId === conversationId && isUnread(m)) m.readAt = now;
    return { ok: true };
}

/** The lead's conversation, created empty if it doesn't exist yet (one per lead). Idempotent. */
export async function startConversation(kennelId: string, leadId: string): Promise<{ ok: true; conversationId: string } | { ok: false; fieldErrors: Record<string, never>; formError: { key: string } }> {
    void kennelId;
    const store = getMockStore();
    if (!store.leads.some((l) => l.id === leadId)) return { ok: false, fieldErrors: {}, formError: { key: "notFound" } };
    const existing = store.conversations.find((c) => c.leadId === leadId);
    if (existing) return { ok: true, conversationId: existing.id };
    const conversation: Conversation = { id: `conv_${crypto.randomUUID()}`, leadId, lastMessageAt: new Date().toISOString() };
    store.conversations.push(conversation);
    return { ok: true, conversationId: conversation.id };
}
