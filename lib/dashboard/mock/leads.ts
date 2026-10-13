// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only.)
//
// Leads from Leads.dc.html / Leads-Detail.dc.html, one person per email.
// Every date is relative to the day the store is built, so "due today" stays
// true in a demo. Ricardo, Marina and Camila's ids are stable: the Autumn
// litter waitlist (mock/litters.ts) points at them.
import { addDays, dateInZone, DEFAULT_TIME_ZONE } from "../dateOnly";
import type { Lead, LeadEvent, LeadNote, LeadSource, LeadStage, LostReason, PreferredContact } from "../types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Spec = {
    slug: string;
    name: string;
    email?: string;
    phone?: string;
    contact?: PreferredContact;
    city?: string;
    state?: string;
    source: LeadSource;
    stage: LeadStage;
    breed: string;
    note?: string;
    litterId?: string;
    dogId?: string;
    /** Follow-up as days from today (negative = overdue). */
    followUp?: number;
    message?: string;
    createdAgo: number; // ms
    activityAgo: number; // ms
    /** Stages passed through before the current one (for the event log). */
    path?: LeadStage[];
    /** The lead holds this puppy (reserved for them). */
    reservedDog?: { id: string; name: string };
    lost?: { reason: LostReason; from: LeadStage };
};

const LAB = "Labrador Retriever";
const POODLE = "Poodle";

const SPECS: Spec[] = [
    // New
    { slug: "lead-ricardo-alves", name: "Ricardo Alves", email: "ricardo.alves@example.com", phone: "+55 71 98812 3344", contact: "WHATSAPP", city: "Salvador", state: "BA", source: "PUBLIC_FORM", stage: "NEW", breed: LAB, note: "Male, any colour", litterId: "ltr_autumn", followUp: 0, message: "Hello! Do you still have males from the Autumn litter? Any colour is fine for us.", createdAgo: 13 * MINUTE, activityAgo: 12 * MINUTE },
    { slug: "lead-helena-prado", name: "Helena Prado", email: "helena.prado@example.com", contact: "EMAIL", city: "Curitiba", state: "PR", source: "DIRECTORY", stage: "NEW", breed: POODLE, note: "Female, any litter", dogId: "dog_pipoca", createdAgo: 2 * HOUR, activityAgo: 2 * HOUR },
    { slug: "lead-bruno-teixeira", name: "Bruno Teixeira", phone: "(41) 99654-2210", contact: "PHONE", source: "PUBLIC_FORM", stage: "NEW", breed: LAB, note: "No preference", createdAgo: 1 * DAY + 3 * HOUR, activityAgo: 1 * DAY + 3 * HOUR },
    // Contacted
    { slug: "lead-camila-torres", name: "Camila Torres", email: "camila.torres@example.com", phone: "+55 11 97700 1122", contact: "WHATSAPP", city: "São Paulo", state: "SP", source: "PUBLIC_FORM", stage: "CONTACTED", breed: LAB, note: "Chocolate male", dogId: "dog_mocha", followUp: 3, message: "Hi! I saw Mocha on your page. He is so handsome.", createdAgo: 4 * DAY, activityAgo: 1 * HOUR },
    { slug: "lead-andre-souza", name: "André Souza", email: "andre.souza@example.com", contact: "EMAIL", city: "Belo Horizonte", state: "MG", source: "REFERRAL", stage: "CONTACTED", breed: LAB, note: "Female", createdAgo: 6 * DAY, activityAgo: 2 * DAY },
    { slug: "lead-larissa-campos", name: "Larissa Campos", email: "larissa.campos@example.com", contact: "EMAIL", source: "DIRECTORY", stage: "CONTACTED", breed: POODLE, createdAgo: 8 * DAY, activityAgo: 3 * DAY },
    { slug: "lead-thiago-nunes", name: "Thiago Nunes", phone: "+55 21 99123 0099", contact: "PHONE", city: "Niterói", state: "RJ", source: "OTHER", stage: "CONTACTED", breed: LAB, note: "Black male", followUp: 6, createdAgo: 9 * DAY, activityAgo: 4 * DAY },
    // Interested
    { slug: "lead-marina-costa", name: "Marina Costa", email: "marina.costa@example.com", phone: "+55 75 99123 4567", contact: "WHATSAPP", city: "Feira de Santana", state: "BA", source: "PUBLIC_FORM", stage: "INTERESTED", breed: LAB, note: "Chocolate female", litterId: "ltr_autumn", followUp: 0, message: "Hi! We have two kids and a fenced yard in Feira de Santana. We would love a calm chocolate female from the Autumn litter. Is anyone still available, and what is the process?", createdAgo: 6 * DAY, activityAgo: 3 * DAY },
    { slug: "lead-paulo-lima", name: "Paulo Lima", email: "paulo.lima@example.com", contact: "EMAIL", source: "DIRECTORY", stage: "INTERESTED", breed: POODLE, note: "Frida’s next litter", dogId: "dog_frida", createdAgo: 10 * DAY, activityAgo: 4 * DAY, path: ["CONTACTED"] },
    { slug: "lead-sofia-almeida", name: "Sofia Almeida", email: "sofia.almeida@example.com", phone: "+55 31 98888 7766", contact: "WHATSAPP", source: "REFERRAL", stage: "INTERESTED", breed: LAB, litterId: "ltr_winter", followUp: 10, createdAgo: 12 * DAY, activityAgo: 5 * DAY, path: ["CONTACTED"] },
    // Follow-up
    { slug: "lead-ricardo-batista", name: "Ricardo Batista", email: "ricardo.batista@example.com", contact: "EMAIL", source: "PUBLIC_FORM", stage: "FOLLOW_UP", breed: LAB, litterId: "ltr_spring", followUp: 1, createdAgo: 20 * DAY, activityAgo: 7 * DAY, path: ["CONTACTED", "INTERESTED"] },
    { slug: "lead-julia-mendes", name: "Júlia Mendes", email: "julia.mendes@example.com", phone: "+55 48 99777 4411", contact: "PHONE", source: "DIRECTORY", stage: "FOLLOW_UP", breed: POODLE, note: "Male", followUp: 5, createdAgo: 21 * DAY, activityAgo: 8 * DAY, path: ["CONTACTED"] },
    // Reserved (each holds the puppy reserved for them)
    { slug: "lead-pedro-lima", name: "Pedro Lima", email: "pedro.lima@example.com", phone: "+55 71 99555 2020", contact: "WHATSAPP", source: "REFERRAL", stage: "RESERVED", breed: LAB, note: "Deposit received", dogId: "dog_cafe", createdAgo: 30 * DAY, activityAgo: 5 * DAY, path: ["CONTACTED", "INTERESTED"], reservedDog: { id: "dog_cafe", name: "Café" } },
    { slug: "lead-isabela-rocha", name: "Isabela Rocha", email: "isabela.rocha@example.com", contact: "EMAIL", source: "PUBLIC_FORM", stage: "RESERVED", breed: LAB, note: "Deposit pending", dogId: "dog_tostao", followUp: -2, createdAgo: 25 * DAY, activityAgo: 6 * DAY, path: ["CONTACTED", "INTERESTED"], reservedDog: { id: "dog_tostao", name: "Tostão" } },
    // Sold (recent)
    { slug: "lead-fernando-dias", name: "Fernando Dias", email: "fernando.dias@example.com", contact: "EMAIL", source: "DIRECTORY", stage: "SOLD", breed: LAB, note: "Went home in September", dogId: "dog_canela", createdAgo: 70 * DAY, activityAgo: 35 * DAY, path: ["CONTACTED", "RESERVED"] },
    // Sold more than 90 days ago: hidden from the board, visible in the list view
    { slug: "lead-rafaela-moura", name: "Rafaela Moura", email: "rafaela.moura@example.com", contact: "EMAIL", source: "PUBLIC_FORM", stage: "SOLD", breed: POODLE, dogId: "dog_cookie", createdAgo: 160 * DAY, activityAgo: 110 * DAY, path: ["RESERVED"] },
    { slug: "lead-gustavo-pires", name: "Gustavo Pires", phone: "+55 51 98444 3311", contact: "PHONE", source: "REFERRAL", stage: "SOLD", breed: POODLE, litterId: "ltr_summer", createdAgo: 190 * DAY, activityAgo: 130 * DAY, path: ["RESERVED"] },
    { slug: "lead-carla-nogueira", name: "Carla Nogueira", email: "carla.nogueira@example.com", contact: "EMAIL", source: "OTHER", stage: "SOLD", breed: LAB, note: "Yellow female", createdAgo: 260 * DAY, activityAgo: 200 * DAY },
    // Lost: one per reason in use. Not on the board; list view, Stage = Lost.
    { slug: "lead-diego-ramos", name: "Diego Ramos", email: "diego.ramos@example.com", contact: "EMAIL", source: "DIRECTORY", stage: "LOST", breed: LAB, createdAgo: 40 * DAY, activityAgo: 15 * DAY, path: ["CONTACTED"], lost: { reason: "NO_RESPONSE", from: "CONTACTED" } },
    { slug: "lead-lucia-freitas", name: "Lúcia Freitas", email: "lucia.freitas@example.com", phone: "+55 62 99321 8765", contact: "WHATSAPP", source: "PUBLIC_FORM", stage: "LOST", breed: POODLE, note: "Wanted a toy poodle", createdAgo: 35 * DAY, activityAgo: 12 * DAY, path: ["CONTACTED", "INTERESTED"], lost: { reason: "BOUGHT_ELSEWHERE", from: "INTERESTED" } },
    { slug: "lead-mateus-barros", name: "Mateus Barros", phone: "+55 92 98111 2233", contact: "PHONE", city: "Manaus", state: "AM", source: "REFERRAL", stage: "LOST", breed: LAB, createdAgo: 28 * DAY, activityAgo: 9 * DAY, path: ["CONTACTED"], lost: { reason: "TOO_FAR", from: "CONTACTED" } },
    { slug: "lead-renata-guedes", name: "Renata Guedes", email: "renata.guedes@example.com", contact: "EMAIL", source: "OTHER", stage: "LOST", breed: POODLE, createdAgo: 22 * DAY, activityAgo: 10 * DAY, path: ["CONTACTED", "INTERESTED"], lost: { reason: "CHANGED_MIND", from: "INTERESTED" } },
];

/** Marina's notes from the design; the second shows that notes stack up. */
const NOTES: { leadId: string; body: string; ago: number }[] = [
    { leadId: "lead-marina-costa", body: "Two kids, fenced yard, prefers a calm female. Wants to visit on a Saturday.", ago: 3 * DAY + 2 * HOUR },
    { leadId: "lead-marina-costa", body: "Called her back. She can pay the deposit next week if they like the puppy in person.", ago: 2 * DAY },
    { leadId: "lead-pedro-lima", body: "Deposit received by bank transfer.", ago: 5 * DAY },
];

export function buildLeadFixtures(): {
    leads: Lead[];
    events: LeadEvent[];
    notes: LeadNote[];
    /** Stand-in for Dog.reservedForLeadId (NEW FIELD): which lead holds which puppy. */
    reservations: { leadId: string; dogId: string }[];
} {
    const now = Date.now();
    const today = dateInZone(DEFAULT_TIME_ZONE);
    const iso = (ago: number) => new Date(now - ago).toISOString();
    const events: LeadEvent[] = [];
    const reservations: { leadId: string; dogId: string }[] = [];
    let seq = 0;
    const id = (slug: string) => `evt_${slug}_${seq++}`;

    const leads = SPECS.map((spec): Lead => {
        const leadId = spec.slug;
        events.push({ id: id(leadId), leadId, type: "CREATED", params: { source: spec.source }, createdAt: iso(spec.createdAgo) });

        // Stage changes spread between creation and the last activity. The
        // final step is a reservation or a loss when the spec says so.
        const steps = [...(spec.path ?? []), spec.stage].filter((stage) => stage !== "NEW");
        let from: LeadStage = "NEW";
        steps.forEach((to, i) => {
            const at = iso(spec.createdAgo - ((spec.createdAgo - spec.activityAgo) * (i + 1)) / steps.length);
            if (to === "LOST" && spec.lost) {
                events.push({ id: id(leadId), leadId, type: "MARKED_LOST", params: { from: spec.lost.from, reason: spec.lost.reason }, createdAt: at });
            } else if (to === "RESERVED" && spec.reservedDog) {
                events.push({ id: id(leadId), leadId, type: "PUPPY_RESERVED", params: { dogId: spec.reservedDog.id, dogName: spec.reservedDog.name }, createdAt: at });
            } else {
                events.push({ id: id(leadId), leadId, type: "STAGE_CHANGED", params: { from, to }, createdAt: at });
            }
            from = to;
        });

        const followUpAt = spec.followUp === undefined ? null : addDays(today, spec.followUp);
        if (followUpAt) events.push({ id: id(leadId), leadId, type: "FOLLOW_UP_SET", params: { date: followUpAt }, createdAt: iso(spec.activityAgo - MINUTE) });
        if (spec.reservedDog) reservations.push({ leadId, dogId: spec.reservedDog.id });

        return {
            id: leadId,
            name: spec.name,
            email: spec.email ?? null,
            phone: spec.phone ?? null,
            preferredContact: spec.contact ?? (spec.email ? "EMAIL" : "PHONE"),
            city: spec.city ?? null,
            state: spec.state ?? null,
            source: spec.source,
            stage: spec.stage,
            interestBreed: spec.breed,
            interestNote: spec.note ?? null,
            litterId: spec.litterId ?? null,
            dogId: spec.dogId ?? null,
            followUpAt,
            firstMessage: spec.message ?? null,
            lostReason: spec.lost?.reason ?? null,
            createdAt: iso(spec.createdAgo),
            lastActivityAt: iso(spec.activityAgo),
        };
    });

    const notes: LeadNote[] = NOTES.map((note, i) => ({ id: `note_${i + 1}`, leadId: note.leadId, body: note.body, createdAt: iso(note.ago) }));
    return { leads, events, notes, reservations };
}
