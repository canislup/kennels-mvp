// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
//
// Reviews of the kennel, the kennel's public replies, reports, and review
// invites. Reads are called from Server Components; mutations from
// app/[locale]/dashboard/reviews/actions.ts, which validates input first.
// Every mutation checks the review belongs to `kennelId` (see ENDPOINTS.md).
import { getMockStore, snapshot } from "./mock/store";
import type { Review, ReviewInviteResult, ReviewListResult, ReviewReportReason, ReviewStatusFilter, ReviewSummary, SimpleMutationResult } from "./types";

export const REVIEWS_PAGE_SIZE = 10;

const notFound = (): SimpleMutationResult => ({ ok: false, fieldErrors: {}, formError: { key: "notFound" } });

const newestFirst = (a: Review, b: Review) => b.createdAt.localeCompare(a.createdAt);

const MATCHES: Record<ReviewStatusFilter, (review: Review) => boolean> = {
    all: () => true,
    "needs-reply": (review) => review.reply === null,
    replied: (review) => review.reply !== null,
    reported: (review) => review.reportedAt !== null,
};

// --- Reads ---------------------------------------------------------------------------

/** Average (one decimal), total, the 5→1 distribution and the tab counts. */
export async function getReviewSummary(kennelId: string): Promise<ReviewSummary> {
    void kennelId;
    const reviews = getMockStore().reviews;
    const total = reviews.length;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
        average: total ? Math.round((sum / total) * 10) / 10 : 0,
        total,
        distribution: [5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((review) => review.rating === stars).length;
            return { stars, count, percent: total ? Math.round((count / total) * 100) : 0 };
        }),
        needsReply: reviews.filter(MATCHES["needs-reply"]).length,
        replied: reviews.filter(MATCHES.replied).length,
        reported: reviews.filter(MATCHES.reported).length,
    };
}

/** Newest first, filtered by tab, `pageSize` per page. */
export async function listReviews(kennelId: string, filters: { status: ReviewStatusFilter; page: number; pageSize?: number }): Promise<ReviewListResult> {
    void kennelId;
    const pageSize = filters.pageSize ?? REVIEWS_PAGE_SIZE;
    const matches = getMockStore().reviews.filter(MATCHES[filters.status]).sort(newestFirst);
    const start = (filters.page - 1) * pageSize;
    return snapshot({ items: matches.slice(start, start + pageSize), total: matches.length, page: filters.page, pageSize });
}

// --- Mutations -----------------------------------------------------------------------

/** Creates the kennel's public reply, or edits it (keeps createdAt, bumps updatedAt). Body already validated (1–1000). */
export async function postReviewReply(kennelId: string, reviewId: string, body: string): Promise<SimpleMutationResult> {
    void kennelId;
    const review = getMockStore().reviews.find((r) => r.id === reviewId);
    if (!review) return notFound();
    const now = new Date().toISOString();
    review.reply = review.reply ? { ...review.reply, body, updatedAt: now } : { body, createdAt: now, updatedAt: now };
    return { ok: true };
}

/** Flags the review for moderation. It stays public until a moderator decides. Reporting twice is refused. */
export async function reportReview(kennelId: string, reviewId: string, input: { reason: ReviewReportReason; details: string | null }): Promise<SimpleMutationResult> {
    void kennelId;
    const review = getMockStore().reviews.find((r) => r.id === reviewId);
    if (!review) return notFound();
    if (review.reportedAt) return { ok: false, fieldErrors: {}, formError: { key: "alreadyReported" } };
    review.reportedAt = new Date().toISOString();
    review.reportReason = input.reason;
    review.reportDetails = input.details;
    return { ok: true };
}

/**
 * A single-use invite link (random token). Email already validated (or null).
 * No email is sent in this version: `emailSent` is always false and the UI
 * says so. The link's public page (/{locale}/review/{token}) doesn't exist yet.
 */
export async function createReviewInvite(kennelId: string, input: { email: string | null; locale: string }): Promise<ReviewInviteResult> {
    void kennelId;
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const token = Buffer.from(bytes).toString("base64url");
    const invite = { id: `invite_${crypto.randomUUID()}`, email: input.email, token, createdAt: new Date().toISOString(), usedAt: null, emailSentAt: null };
    getMockStore().reviewInvites.push(invite);
    return { ok: true, inviteId: invite.id, url: `/${input.locale}/review/${token}`, emailSent: false };
}
