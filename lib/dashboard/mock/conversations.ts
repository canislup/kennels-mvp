// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only.)
//
// The threads from Messages.dc.html, one conversation per lead. Unread = an
// INBOUND message with readAt null: exactly Camila (2), Ricardo (1) and
// Helena (1), so the Messages badge shows 3. Leads without a conversation
// (e.g. Bruno Teixeira, André Souza) exercise the "?lead=" start flow.
import type { Conversation, Message } from "../types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Spec = {
    leadId: string;
    messages: { direction: Message["direction"]; body: string; ago: number; unread?: boolean; sharedDogId?: string }[];
};

const SPECS: Spec[] = [
    {
        leadId: "lead-camila-torres",
        messages: [
            { direction: "INBOUND", body: "Hi! I saw Mocha on your page. He is so handsome.", ago: 2 * DAY + 3 * HOUR },
            { direction: "OUTBOUND", body: "Thank you, Camila! He is a sweet boy. Happy to answer any questions.", ago: 2 * DAY + 2 * HOUR },
            { direction: "OUTBOUND", body: "", sharedDogId: "dog_mocha", ago: 2 * DAY + 2 * HOUR - MINUTE },
            { direction: "INBOUND", body: "He looks even better in these photos!", ago: 70 * MINUTE, unread: true },
            { direction: "INBOUND", body: "Is the chocolate male still available? And does he come with a health guarantee?", ago: 1 * HOUR, unread: true },
        ],
    },
    {
        leadId: "lead-ricardo-alves",
        messages: [{ direction: "INBOUND", body: "Hi, I would like to join the waitlist for the Autumn litter. Could we visit on Saturday to meet the males?", ago: 12 * MINUTE, unread: true }],
    },
    {
        leadId: "lead-marina-costa",
        messages: [
            { direction: "INBOUND", body: "Is Pipoca still available? We could visit this weekend.", ago: 4 * DAY },
            { direction: "OUTBOUND", body: "Yes, she is! Saturday morning works. I will send the address.", ago: 4 * DAY - 2 * HOUR },
            { direction: "INBOUND", body: "Saturday morning works. Thank you!", ago: 3 * HOUR },
        ],
    },
    {
        leadId: "lead-helena-prado",
        messages: [{ direction: "INBOUND", body: "Do you ship Poodle puppies to Recife?", ago: 1 * DAY + 4 * HOUR, unread: true }],
    },
    {
        leadId: "lead-pedro-lima",
        messages: [
            { direction: "OUTBOUND", body: "Deposit received, thank you! Café is all yours.", ago: 5 * DAY },
            { direction: "INBOUND", body: "Café is settling in so well. Photos coming!", ago: 3 * DAY },
        ],
    },
    {
        leadId: "lead-paulo-lima",
        messages: [
            { direction: "INBOUND", body: "Do you have a Poodle litter planned this year?", ago: 11 * DAY },
            { direction: "OUTBOUND", body: "Frida should have her next litter early next year. I can add you to the waitlist.", ago: 10 * DAY + 20 * HOUR },
            { direction: "INBOUND", body: "Thanks, I will wait for Frida’s next litter.", ago: 10 * DAY },
        ],
    },
];

export function buildConversationFixtures(): { conversations: Conversation[]; messages: Message[] } {
    const now = Date.now();
    const iso = (ago: number) => new Date(now - ago).toISOString();
    const conversations: Conversation[] = [];
    const messages: Message[] = [];
    for (const spec of SPECS) {
        const conversationId = `conv-${spec.leadId.replace(/^lead-/, "")}`;
        spec.messages.forEach((message, i) => {
            messages.push({
                id: `${conversationId}-msg-${i + 1}`,
                conversationId,
                direction: message.direction,
                body: message.body,
                sharedDogId: message.sharedDogId ?? null,
                createdAt: iso(message.ago),
                // Outbound messages are the kennel's own; inbound ones are read unless marked unread.
                readAt: message.direction === "INBOUND" && message.unread ? null : iso(message.ago),
            });
        });
        conversations.push({ id: conversationId, leadId: spec.leadId, lastMessageAt: iso(Math.min(...spec.messages.map((m) => m.ago))) });
    }
    return { conversations, messages };
}
