// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (Fixture data only.)
//
// Reviews from Reviews.dc.html (Pedro Lima, Fernando Dias, Isabela Rocha,
// Paulo Lima, with the design's text) plus ten more. 14 in total: nine 5s,
// three 4s, one 3, one 2 (average 4.4). Three have no reply yet (Pedro,
// Isabela, Thiago), eleven are replied, one is reported (Thiago). Reviewers
// who are also leads use the lead's name, so Overview's "New review" item
// names a real review (the newest: Pedro Lima).
import type { Review, ReviewInvite } from "../types";

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

type Spec = Omit<Review, "id" | "createdAt" | "reply" | "reportedAt" | "reportDetails"> & { ago: number; reply?: { text: string; after: number }; reportedAfter?: number };

const SPECS: Spec[] = [
    {
        reviewerName: "Pedro Lima",
        purchaseLabel: "Bought Café, Labrador",
        verified: true,
        rating: 5,
        body: "Café joined our family two weeks ago and she is already part of everything. Ana answered every question we had, sent photos every week and was there the day we took her home. We could not have asked for a better start.",
        ago: 3 * HOUR,
        reportReason: null,
    },
    {
        reviewerName: "Thiago Nunes",
        purchaseLabel: null,
        verified: false,
        rating: 2,
        body: "Asked about prices twice and the answer took days. Expected more from a kennel with this many good reviews.",
        ago: 9 * DAY,
        reportedAfter: 1 * DAY,
        reportReason: "NOT_A_BUYER",
    },
    {
        reviewerName: "Sofia Almeida",
        purchaseLabel: "Bought Pipoca, Labrador",
        verified: true,
        rating: 5,
        body: "Pipoca came home calm, healthy and already used to car rides. The puppy guide they gave us answered everything we worried about in the first week.",
        ago: 16 * DAY,
        reply: { text: "Thank you, Sofia! Pipoca was always the calm one of the litter. Enjoy every walk.", after: 1 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Diego Ramos",
        purchaseLabel: "Bought Biscoito, Labrador",
        verified: true,
        rating: 4,
        body: "Great puppy and very honest answers. Pickup day was a bit rushed, but we got a call the next morning to check how he was doing.",
        ago: 24 * DAY,
        reply: { text: "Thanks, Diego. You are right about pickup day; we now book one family per hour.", after: 2 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Isabela Rocha",
        purchaseLabel: "Reserved Tostão, Labrador",
        verified: false,
        rating: 4,
        body: "Very transparent about the health tests and the whole process. The only reason for four stars is that the wait for the litter felt long, but it was worth it.",
        ago: 34 * DAY,
        reportReason: null,
    },
    {
        reviewerName: "Fernando Dias",
        purchaseLabel: "Bought Ares, Labrador",
        verified: true,
        rating: 5,
        body: "Ares is healthy, social and so well behaved. You can tell the puppies grow up in a real home. Thank you for the follow-up calls after he came home.",
        ago: 38 * DAY,
        reply: { text: "Thank you, Fernando! Ares was a joy to raise. Please send us a photo from his first birthday.", after: 1 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Renata Guedes",
        purchaseLabel: "Bought a Poodle puppy",
        verified: true,
        rating: 3,
        body: "Our puppy is lovely and healthy. Communication before pickup was slow and we had to ask twice for the vaccination card.",
        ago: 47 * DAY,
        reply: { text: "Renata, thank you for saying so. The card should have gone home with her; we added it to our pickup checklist.", after: 2 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Larissa Campos",
        purchaseLabel: "Bought Mel, Poodle",
        verified: true,
        rating: 5,
        body: "Mel is clever, gentle with our kids and fully house-trained in a month. The weekly videos while we waited made the whole thing special.",
        ago: 58 * DAY,
        reply: { text: "Thank you, Larissa! Mel always loved an audience. Hugs to the kids.", after: 1 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Paulo Lima",
        purchaseLabel: "Bought Frida’s puppy, Poodle",
        verified: true,
        rating: 5,
        body: "Our Poodle is the sweetest dog we have ever had. The kennel is clean, calm and obviously loved.",
        ago: 64 * DAY,
        reply: { text: "Thank you, Paulo! Give Frida’s girl a hug from all of us.", after: 3 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Júlia Mendes",
        purchaseLabel: "Bought Amora, Labrador",
        verified: true,
        rating: 4,
        body: "Amora is perfect. Four stars only because the drive to the kennel is long, which is not really their fault.",
        ago: 80 * DAY,
        reply: { text: "Thanks, Júlia! Next time we can meet halfway.", after: 1 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Gustavo Pires",
        purchaseLabel: "Bought Duque’s son, Poodle",
        verified: true,
        rating: 5,
        body: "Second dog from this kennel and the same care both times. Health tests, contract and microchip were all ready on day one.",
        ago: 96 * DAY,
        reply: { text: "Gustavo, thank you for coming back to us. Say hi to both boys!", after: 2 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Carla Nogueira",
        purchaseLabel: "Bought a Labrador puppy",
        verified: true,
        rating: 5,
        body: "We visited three kennels before this one. This is the only place where the parents were relaxed and the puppies were clearly part of the house.",
        ago: 121 * DAY,
        reply: { text: "Thank you, Carla. That means a lot to us.", after: 1 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Mateus Barros",
        purchaseLabel: "Bought Bolinha, Poodle",
        verified: true,
        rating: 5,
        body: "Bolinha is a happy, healthy girl. Ana still answers our questions months later.",
        ago: 150 * DAY,
        reply: { text: "Always happy to help, Mateus!", after: 1 * DAY },
        reportReason: null,
    },
    {
        reviewerName: "Lúcia Freitas",
        purchaseLabel: "Bought Nino, Labrador",
        verified: true,
        rating: 5,
        body: "Professional, kind and patient with all our first-time-owner questions. Nino is thriving.",
        ago: 190 * DAY,
        reply: { text: "Thank you, Lúcia! Nino was lucky to find you.", after: 2 * DAY },
        reportReason: null,
    },
];

export function buildReviewFixtures(): { reviews: Review[]; reviewInvites: ReviewInvite[] } {
    const now = Date.now();
    const iso = (ms: number) => new Date(ms).toISOString();
    const reviews = SPECS.map(({ ago, reply, reportedAfter, ...review }, index): Review => {
        const createdAt = now - ago;
        return {
            ...review,
            id: `review_${index + 1}`,
            createdAt: iso(createdAt),
            reply: reply ? { body: reply.text, createdAt: iso(createdAt + reply.after), updatedAt: iso(createdAt + reply.after) } : null,
            reportedAt: reportedAfter ? iso(createdAt + reportedAfter) : null,
            reportDetails: reportedAfter ? "This person asked about prices but never bought a puppy from us." : null,
        };
    });
    const reviewInvites: ReviewInvite[] = [
        { id: "invite_1", email: "sofia.almeida@example.com", token: "f3b1c9a2d8e74b51", createdAt: iso(now - 20 * DAY), usedAt: iso(now - 16 * DAY), emailSentAt: null },
        { id: "invite_2", email: null, token: "a71e0c55b2d94f08", createdAt: iso(now - 4 * DAY), usedAt: null, emailSentAt: null },
    ];
    return { reviews, reviewInvites };
}
