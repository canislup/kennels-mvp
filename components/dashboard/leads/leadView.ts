// Server-side display strings for a lead card / list row. Computed on the
// server so due labels use the viewer's calendar day ("YYYY-MM-DD" only).
import type { getFormatter, getTranslations } from "next-intl/server";
import type { LeadCard, LeadSource, LeadStage } from "@/lib/dashboard/types";
// LeadStage here can be LOST (list view); board columns only ever receive the six pipeline stages.
import { daysBetween } from "@/lib/dashboard/dateOnly";
import { formatRelativeTime } from "../relativeTime";
import { fromDateOnly } from "../dateOnly";
import { leadHref } from "../hrefs";
import type { DueTone } from "./leadMeta";

type T = Awaited<ReturnType<typeof getTranslations<"dashboard.leads">>>;
type TTime = Awaited<ReturnType<typeof getTranslations<"dashboard.common.time">>>;
type Format = Awaited<ReturnType<typeof getFormatter>>;

export type LeadCardView = {
    id: string;
    name: string;
    stage: LeadStage;
    href: string;
    interest: string;
    source: LeadSource;
    sourceLabel: string;
    unread: boolean;
    followUp: { label: string; tone: DueTone } | null;
    activity: string;
    /** Translated lost reason (Lost leads only). */
    lostReason: string | null;
};

export function followUpLabel(followUpAt: string, today: string, t: T, format: Format): { label: string; tone: DueTone } {
    const days = daysBetween(today, followUpAt);
    if (days < 0) return { label: t("due.overdue", { days: -days }), tone: "red" };
    if (days === 0) return { label: t("due.today"), tone: "red" };
    if (days === 1) return { label: t("due.tomorrow"), tone: "amber" };
    if (days <= 7) return { label: t("due.inDays", { days }), tone: "neutral" };
    return { label: t("due.on", { date: format.dateTime(fromDateOnly(followUpAt), { day: "numeric", month: "short" }) }), tone: "neutral" };
}

/** The interest line: the buyer's own words, then what it's linked to; else the breed. */
export function interestLine(card: Pick<LeadCard, "interestNote" | "interestBreed" | "dogName" | "litterName">, t: T): string {
    const link = card.dogName ?? card.litterName;
    if (card.interestNote && link) return t("card.interestWithLink", { note: card.interestNote, link });
    if (card.interestNote) return card.interestNote;
    if (card.dogName) return t("card.interestWithLink", { note: card.dogName, link: card.interestBreed });
    if (card.litterName) return t("card.interestWithLink", { note: card.interestBreed, link: card.litterName });
    return card.interestBreed;
}

export function toLeadCardView(card: LeadCard, ctx: { t: T; tTime: TTime; format: Format; today: string; now: Date }): LeadCardView {
    return {
        id: card.id,
        name: card.name,
        stage: card.stage,
        href: leadHref(card.id),
        interest: interestLine(card, ctx.t),
        source: card.source,
        sourceLabel: ctx.t(`sources.${card.source}`),
        unread: card.hasUnread,
        followUp: card.followUpAt ? followUpLabel(card.followUpAt, ctx.today, ctx.t, ctx.format) : null,
        activity: formatRelativeTime(ctx.format, ctx.tTime, card.lastActivityAt, ctx.now),
        lostReason: card.lostReason ? ctx.t(`lostReasons.${card.lostReason}`) : null,
    };
}
