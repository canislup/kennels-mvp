import { getFormatter, getTranslations } from "next-intl/server";
import { Check, Clock, FileText, Heart, HeartOff, ListMinus, ListPlus, MessageSquare, Plus, RotateCcw, XCircle, type LucideIcon } from "lucide-react";
import type { TimelineItem } from "@/lib/dashboard/types";
import { formatRelativeTime } from "../../relativeTime";
import { fromDateOnly } from "../../dateOnly";

type Style = { icon: LucideIcon; tile: string };

const EVENT_STYLE: Record<Extract<TimelineItem, { kind: "event" }>["type"], Style> = {
    CREATED: { icon: Plus, tile: "bg-accent-soft text-accent" },
    STAGE_CHANGED: { icon: Check, tile: "bg-status-green-bg text-status-green" },
    FOLLOW_UP_SET: { icon: Clock, tile: "bg-status-amber-bg text-status-amber" },
    FOLLOW_UP_DONE: { icon: Check, tile: "bg-status-amber-bg text-status-amber" },
    MARKED_LOST: { icon: XCircle, tile: "bg-status-red-bg text-status-red" },
    REOPENED: { icon: RotateCcw, tile: "bg-accent-soft text-accent" },
    PUPPY_RESERVED: { icon: Heart, tile: "bg-status-pink-bg text-status-pink" },
    PUPPY_RELEASED: { icon: HeartOff, tile: "bg-stone-100 text-stone-600" },
    WAITLIST_ADDED: { icon: ListPlus, tile: "bg-status-blue-bg text-status-blue" },
    WAITLIST_REMOVED: { icon: ListMinus, tile: "bg-stone-100 text-stone-600" },
};
const NOTE_STYLE: Style = { icon: FileText, tile: "bg-stone-100 text-stone-700" };
const MESSAGE_STYLE: Style = { icon: MessageSquare, tile: "bg-status-blue-bg text-status-blue" };

const EXCERPT = 120;
const excerpt = (text: string) => (text.length > EXCERPT ? `${text.slice(0, EXCERPT - 1).trimEnd()}…` : text);

/** The lead timeline: events, notes and messages, newest first, each rendered from data in the viewer's language. */
export default async function Timeline({ items, leadFirstName }: { items: TimelineItem[]; leadFirstName: string }) {
    const [t, tLeads, tTime, format] = await Promise.all([
        getTranslations("dashboard.leads.detail.timeline"),
        getTranslations("dashboard.leads"),
        getTranslations("dashboard.common.time"),
        getFormatter(),
    ]);
    const now = new Date();
    const day = (date: string) => format.dateTime(fromDateOnly(date), { day: "numeric", month: "short" });

    function describe(item: TimelineItem): { style: Style; title: string; detail?: string } {
        if (item.kind === "note") return { style: NOTE_STYLE, title: t("note"), detail: item.body };
        if (item.kind === "message") {
            const title = item.direction === "INBOUND" ? t("messageIn", { name: leadFirstName }) : t("messageOut");
            const parts = [item.body && `“${excerpt(item.body)}”`, item.sharedDogName && t("sharedDog", { dog: item.sharedDogName })].filter(Boolean);
            return { style: MESSAGE_STYLE, title, detail: parts.join(" · ") };
        }
        const style = EVENT_STYLE[item.type];
        const p = item.params as Record<string, string>;
        switch (item.type) {
            case "CREATED":
                return { style, title: t("created"), detail: t("createdDetail", { source: tLeads(`sources.${p.source}`) }) };
            case "STAGE_CHANGED":
                return {
                    style,
                    title: t("stageChanged", { stage: tLeads(`stages.${p.to}`) }),
                    detail: (item.params as { auto?: boolean }).auto ? t("stageChangedAuto") : t("stageChangedDetail", { from: tLeads(`stages.${p.from}`) }),
                };
            case "FOLLOW_UP_SET":
                return { style, title: t("followUpSet", { date: day(p.date) }) };
            case "FOLLOW_UP_DONE":
                return { style, title: t("followUpDone"), detail: t("followUpDoneDetail", { date: day(p.date) }) };
            case "MARKED_LOST":
                return { style, title: t("markedLost"), detail: tLeads(`lostReasons.${p.reason}`) };
            case "REOPENED":
                return { style, title: t("reopened"), detail: t("reopenedDetail", { stage: tLeads(`stages.${p.to}`) }) };
            case "PUPPY_RESERVED":
                return { style, title: t("puppyReserved", { dog: p.dogName }) };
            case "PUPPY_RELEASED":
                return { style, title: t("puppyReleased", { dog: p.dogName }), detail: t("puppyReleasedDetail") };
            case "WAITLIST_ADDED":
                return { style, title: t("waitlistAdded", { litter: p.litterName }) };
            case "WAITLIST_REMOVED":
                return { style, title: t("waitlistRemoved", { litter: p.litterName }) };
        }
    }

    if (items.length === 0) return <p className="py-4 text-sm text-stone-500">{t("empty")}</p>;

    return (
        <ol>
            {items.map((item) => {
                const { style, title, detail } = describe(item);
                const Icon = style.icon;
                return (
                    <li key={`${item.kind}-${item.id}`} className="flex gap-3.5 border-t border-line py-3.5">
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] ${style.tile}`} aria-hidden>
                            <Icon className="size-4" strokeWidth={1.8} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-stone-900">{title}</p>
                            {detail && <p className="mt-0.5 text-[13px] wrap-break-word whitespace-pre-line text-stone-600">{detail}</p>}
                        </div>
                        <time dateTime={item.createdAt} className="text-xs whitespace-nowrap text-stone-500">
                            {formatRelativeTime(format, tTime, item.createdAt, now)}
                        </time>
                    </li>
                );
            })}
        </ol>
    );
}
