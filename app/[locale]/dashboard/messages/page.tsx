import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getLeadSummary } from "@/lib/dashboard/leads";
import { getConversationForLead, getConversationThread, getShareableDogs, listConversations } from "@/lib/dashboard/messages";
import { dateInZone, getViewerTimeZone, getViewerToday, addDays } from "@/lib/dashboard/viewerDate";
import type { BoardStage, ConversationListItem, LeadStage } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import SubmitButton from "@/components/dashboard/ui/SubmitButton";
import UrlFilters from "@/components/dashboard/ui/UrlFilters";
import Composer from "@/components/dashboard/messages/Composer";
import MarkRead from "@/components/dashboard/messages/MarkRead";
import MessageBubble from "@/components/dashboard/messages/MessageBubble";
import ScrollToLatest from "@/components/dashboard/messages/ScrollToLatest";
import SharedDogCard from "@/components/dashboard/messages/SharedDogCard";
import { followUpLabel, interestLine } from "@/components/dashboard/leads/leadView";
import { DUE_BADGE, STAGE_PILL } from "@/components/dashboard/leads/leadMeta";
import { formatRelativeTime } from "@/components/dashboard/relativeTime";
import { leadHref } from "@/components/dashboard/hrefs";
import { initialsOf } from "@/lib/dashboard/messages";
import { advanceLeadAction, startConversationAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("dashboard.messages");
    return { title: t("title") };
}

type SearchParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

const THREAD_ID = "message-thread";
const SCROLLER_ID = "message-thread-scroller";
const linkClasses = "rounded font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** "Move to {next}" is offered for these stages only. */
const NEXT_STAGE: Partial<Record<LeadStage, BoardStage>> = { NEW: "CONTACTED", CONTACTED: "INTERESTED", INTERESTED: "FOLLOW_UP" };

/**
 * Inbox: conversation list · thread · lead panel. Everything lives in the URL
 * (`conversation`, `q`, `filter`, `lead`). Below lg one pane shows at a time:
 * the list without `?conversation=`, the thread with it.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const kennel = await getCurrentKennel();
    if (!kennel) notFound();
    const raw = await searchParams;
    const q = one(raw.q)?.trim() || undefined;
    const unreadOnly = one(raw.filter) === "unread";
    const conversationParam = one(raw.conversation);
    const leadParam = one(raw.lead);

    // ?lead=<id> (from a lead page): its conversation if there is one, else offer to start one.
    let startLead: { id: string; name: string } | null = null;
    if (leadParam && !conversationParam) {
        const existing = await getConversationForLead(kennel.id, leadParam);
        if (existing) redirect({ href: `/dashboard/messages?conversation=${encodeURIComponent(existing.conversationId)}`, locale: await getLocale() });
        const lead = await getLeadSummary(kennel.id, leadParam);
        if (lead) startLead = { id: lead.id, name: lead.name };
    }

    const [t, tLeads, tTime, format, matching, allConversations, unreadConversations, zone, today] = await Promise.all([
        getTranslations("dashboard"),
        getTranslations("dashboard.leads"),
        getTranslations("dashboard.common.time"),
        getFormatter(),
        listConversations(kennel.id, { q }),
        listConversations(kennel.id),
        listConversations(kennel.id, { unreadOnly: true }),
        getViewerTimeZone(),
        getViewerToday(),
    ]);

    // Unread filter: the open conversation stays listed after it's read, so it doesn't vanish under the cursor.
    const conversations = unreadOnly ? matching.filter((c) => c.unreadCount > 0 || c.id === conversationParam) : matching;
    // Desktop shows the first conversation when none is chosen (below lg the list shows instead).
    const selectedId = startLead ? null : (conversationParam ?? conversations[0]?.id ?? null);
    const [thread, dogs] = await Promise.all([selectedId ? getConversationThread(kennel.id, selectedId) : null, selectedId ? getShareableDogs(kennel.id) : []]);
    const showThreadOnMobile = Boolean(conversationParam || startLead);
    const now = new Date();

    const hrefWith = (changes: Record<string, string | undefined>) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && key !== "lead") params.set(key, value);
        for (const [key, value] of Object.entries(changes)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        const query = params.toString();
        return `/dashboard/messages${query ? `?${query}` : ""}`;
    };

    const previewText = (item: ConversationListItem) => {
        const p = item.lastMessagePreview;
        if (p.kind === "none") return t("messages.list.noMessages");
        const text = p.kind === "dog" ? t("messages.list.sharedDog", { dog: p.dogName }) : p.text;
        return p.direction === "OUTBOUND" ? t("messages.list.you", { text }) : text;
    };

    const filterLink = (value: "all" | "unread", label: string) => {
        const active = unreadOnly === (value === "unread");
        return (
            <Link
                href={hrefWith({ filter: value === "unread" ? "unread" : undefined, conversation: undefined })}
                aria-current={active ? "page" : undefined}
                scroll={false}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active ? "border-stone-900 bg-stone-900 text-stone-50" : "border-line-strong bg-white text-stone-700 hover:bg-stone-50"
                }`}
            >
                {label}
            </Link>
        );
    };

    // Literal class strings (Tailwind only generates classes it can see).
    const ROW_LOOK = { idle: "bg-white hover:bg-stone-50", selected: "bg-accent-soft", selectedLg: "bg-white hover:bg-stone-50 lg:bg-accent-soft lg:hover:bg-accent-soft" };
    const AVATAR_LOOK = { idle: "bg-stone-100 text-stone-600", selected: "bg-accent text-white", selectedLg: "bg-stone-100 text-stone-600 lg:bg-accent lg:text-white" };

    // --- Panes ----------------------------------------------------------------------

    const list = (
        <section aria-labelledby="messages-list-heading" className={`${showThreadOnMobile ? "hidden lg:flex" : "flex"} min-h-0 min-w-0 flex-1 flex-col border-line lg:w-80 lg:flex-none lg:border-r`}>
            <h2 id="messages-list-heading" className="sr-only">
                {t("messages.list.heading")}
            </h2>
            <div className="border-b border-line p-4">
                <UrlFilters
                    className="mb-0 [&>div]:flex-[1_1_100%]"
                    searchLabel={t("messages.list.searchLabel")}
                    searchPlaceholder={t("messages.list.searchPlaceholder")}
                    selects={[]}
                    after={
                        <nav aria-label={t("messages.list.filterLabel")} className="flex gap-2">
                            {filterLink("all", t("messages.list.all"))}
                            {filterLink("unread", t("messages.list.unread", { count: unreadConversations.length }))}
                        </nav>
                    }
                />
            </div>
            {allConversations.length === 0 ? (
                <div className="px-5 py-10 text-center">
                    <MessageSquare className="mx-auto mb-3 size-6 text-stone-400" aria-hidden />
                    <p className="text-sm font-medium text-stone-700">{t("messages.empty.none")}</p>
                </div>
            ) : conversations.length === 0 ? (
                <div className="px-5 py-10 text-center">
                    <p className="text-sm font-medium text-stone-700">{t("messages.empty.noMatches")}</p>
                    <Link href="/dashboard/messages" className={`mt-2 inline-block text-[13px] ${linkClasses}`}>
                        {t("messages.empty.clear")}
                    </Link>
                </div>
            ) : (
                <ul className="min-h-0 flex-1 overflow-y-auto">
                    {conversations.map((item) => {
                        const selected = item.id === selectedId;
                        // The desktop default (no ?conversation=) isn't shown below lg, so it's highlighted only from lg.
                        const look = !selected ? "idle" : conversationParam ? "selected" : "selectedLg";
                        const unread = item.unreadCount > 0;
                        return (
                            <li key={item.id}>
                                <Link
                                    href={hrefWith({ conversation: item.id })}
                                    scroll={false}
                                    aria-current={selected ? "true" : undefined}
                                    className={`flex gap-3 border-b border-line p-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                                        ROW_LOOK[look]
                                    }`}
                                >
                                    <span
                                        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${AVATAR_LOOK[look]}`}
                                        aria-hidden
                                    >
                                        {item.initials}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="mb-0.5 flex justify-between gap-2">
                                            <span className={`truncate text-sm text-stone-900 ${unread ? "font-semibold" : "font-medium"}`}>{item.leadName}</span>
                                            <time dateTime={item.lastMessageAt} className="shrink-0 text-[11px] text-stone-500">
                                                {formatRelativeTime(format, tTime, item.lastMessageAt, now)}
                                            </time>
                                        </span>
                                        <span className={`block truncate text-[13px] ${unread ? "font-semibold text-stone-900" : "text-stone-500"}`}>{previewText(item)}</span>
                                    </span>
                                    {unread && (
                                        <span className="self-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">
                                            <span aria-hidden>{item.unreadCount}</span>
                                            <span className="sr-only">{t("messages.list.unreadCount", { count: item.unreadCount })}</span>
                                        </span>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );

    const backLink = (
        <Link href={hrefWith({ conversation: undefined })} scroll={false} className={`mb-3 inline-flex items-center gap-1.5 text-[13px] lg:hidden ${linkClasses}`}>
            <ArrowLeft className="size-3.5" aria-hidden />
            {t("messages.thread.back")}
        </Link>
    );

    let threadPane: React.ReactNode;
    if (startLead) {
        threadPane = (
            <section aria-labelledby="start-heading" className="flex min-w-0 flex-1 flex-col p-6">
                {backLink}
                <div className="m-auto max-w-sm py-12 text-center">
                    <MessageSquare className="mx-auto mb-3 size-7 text-stone-400" aria-hidden />
                    <h2 id="start-heading" className="mb-2 font-display text-xl font-bold">
                        {t("messages.start.title", { name: startLead.name })}
                    </h2>
                    <p className="mb-5 text-sm text-stone-600">{t("messages.start.description")}</p>
                    <form action={startConversationAction.bind(null, startLead.id)}>
                        <SubmitButton pendingLabel={t("messages.start.pending")}>{t("messages.start.button", { name: startLead.name })}</SubmitButton>
                    </form>
                </div>
            </section>
        );
    } else if (thread) {
        const lead = thread.lead;
        const firstName = lead.name.split(/\s+/)[0] ?? lead.name;
        const interest = interestLine({ ...lead, dogName: lead.dog?.name ?? null }, tLeads);
        const unreadCount = thread.messages.filter((m) => m.direction === "INBOUND" && !m.readAt).length;
        const dayLabel = (iso: string) => {
            const day = dateInZone(zone, new Date(iso));
            if (day === today) return t("messages.thread.today");
            if (day === addDays(today, -1)) return t("messages.thread.yesterday");
            return format.dateTime(new Date(iso), { weekday: "long", day: "numeric", month: "long", timeZone: zone });
        };
        const timeOf = (iso: string) => format.dateTime(new Date(iso), { hour: "numeric", minute: "2-digit", timeZone: zone });

        const rows: React.ReactNode[] = [];
        let previousDay = "";
        for (const message of thread.messages) {
            const day = dateInZone(zone, new Date(message.createdAt));
            if (day !== previousDay) {
                previousDay = day;
                rows.push(
                    <div key={`day-${day}`} role="separator" className="self-center rounded-full bg-stone-100 px-3 py-0.75 text-[11px] font-semibold text-stone-600">
                        {dayLabel(message.createdAt)}
                    </div>,
                );
            }
            const align = message.direction === "INBOUND" ? "start" : "end";
            if (message.body) {
                rows.push(
                    <MessageBubble
                        key={message.id}
                        direction={message.direction}
                        label={message.direction === "INBOUND" ? t("leads.detail.conversation.theyWrote", { name: firstName }) : t("leads.detail.conversation.youWrote")}
                        meta={<time dateTime={message.createdAt}>{timeOf(message.createdAt)}</time>}
                    >
                        <span className="whitespace-pre-line">{message.body}</span>
                    </MessageBubble>,
                );
            }
            if (message.sharedDog) {
                const dog = message.sharedDog;
                const age = dog.ageParts && t(`common.age.${dog.ageParts.unit}`, { count: dog.ageParts.count });
                rows.push(
                    <SharedDogCard
                        key={`${message.id}-dog`}
                        dogId={dog.id}
                        name={dog.name}
                        label={t("messages.thread.dogShared")}
                        meta={[dog.breed, t(`common.sex.${dog.sex}`), age].filter(Boolean).join(" · ")}
                        coverPhotoUrl={dog.coverPhotoUrl}
                        align={align}
                    />,
                );
            }
        }

        threadPane = (
            <section id={THREAD_ID} aria-label={t("messages.thread.label", { name: lead.name })} className={`${showThreadOnMobile ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-1 flex-col`}>
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent" aria-hidden>
                            {initialsOf(lead.name)}
                        </span>
                        <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-stone-900">{lead.name}</div>
                            <div className="truncate text-xs text-stone-500">{t("messages.thread.interestedIn", { interest })}</div>
                        </div>
                    </div>
                    <Link href={leadHref(lead.id)} className={`shrink-0 text-[13px] ${linkClasses}`}>
                        {t("messages.thread.openLead")}
                    </Link>
                </div>
                <div className="px-4 pt-3 sm:px-6 lg:hidden">{backLink}</div>
                <div id={SCROLLER_ID} role="log" aria-label={t("messages.thread.history")} className="flex min-h-60 flex-1 flex-col gap-3.5 overflow-y-auto bg-white px-4 py-6 sm:px-6">
                    {rows.length === 0 ? <p className="m-auto text-sm text-stone-500">{t("messages.thread.empty", { name: firstName })}</p> : rows}
                </div>
                <Composer key={thread.conversation.id} conversationId={thread.conversation.id} firstName={firstName} dogs={dogs} />
                <ScrollToLatest scrollerId={SCROLLER_ID} lastMessageId={thread.messages[thread.messages.length - 1]?.id ?? null} />
                {/* Only an explicitly opened conversation is marked read: the desktop default isn't a click, and in the Unread filter marking it would open the next one, and so on. */}
                {conversationParam && unreadCount > 0 && <MarkRead conversationId={thread.conversation.id} targetId={THREAD_ID} />}
            </section>
        );
    } else {
        threadPane = (
            <section aria-label={t("messages.thread.none")} className={`${showThreadOnMobile ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col items-center justify-center p-10 text-center`}>
                {conversationParam && backLink}
                <p className="text-sm text-stone-500">{conversationParam ? t("messages.thread.notFound") : t("messages.thread.none")}</p>
            </section>
        );
    }

    const panel = thread && (
        <aside aria-labelledby="lead-panel-heading" className="hidden w-70 shrink-0 flex-col gap-4.5 overflow-y-auto border-l border-line p-6 xl:flex">
            <h2 id="lead-panel-heading" className="font-display text-lg font-bold">
                {t("messages.panel.heading")}
            </h2>
            <dl className="flex flex-col gap-4.5">
                <PanelRow label={t("messages.panel.stage")}>
                    <span className={`rounded-full px-2.5 py-0.75 text-xs font-semibold ${STAGE_PILL[thread.lead.stage]}`}>{tLeads(`stages.${thread.lead.stage}`)}</span>
                </PanelRow>
                <PanelRow label={t("messages.panel.lookingFor")}>{[thread.lead.interestNote, thread.lead.interestBreed].filter(Boolean).join(" · ")}</PanelRow>
                <PanelRow label={t("messages.panel.dog")}>
                    {thread.lead.dog ? (
                        <Link href={`/dashboard/dogs/${thread.lead.dog.id}/edit`} className={linkClasses}>
                            {[thread.lead.dog.name, thread.lead.dog.litterName].filter(Boolean).join(", ")}
                        </Link>
                    ) : (
                        <span className="text-stone-500">{t("leads.detail.notProvided")}</span>
                    )}
                </PanelRow>
                <PanelRow label={t("messages.panel.followUp")}>
                    {thread.lead.followUpAt ? (
                        (() => {
                            const due = followUpLabel(thread.lead.followUpAt, today, tLeads, format);
                            return <span className={`rounded-full px-2.25 py-0.75 text-xs font-semibold ${DUE_BADGE[due.tone]}`}>{due.label}</span>;
                        })()
                    ) : (
                        <span className="text-stone-500">{t("messages.panel.noFollowUp")}</span>
                    )}
                </PanelRow>
                <PanelRow label={t("messages.panel.email")}>
                    {thread.lead.email ? (
                        <a href={`mailto:${thread.lead.email}`} className={`break-all ${linkClasses}`}>
                            {thread.lead.email}
                        </a>
                    ) : (
                        <span className="text-stone-500">{t("leads.detail.notProvided")}</span>
                    )}
                </PanelRow>
                <PanelRow label={t("messages.panel.phone")}>
                    {thread.lead.phone ? (
                        <a href={`tel:${thread.lead.phone.replace(/[^\d+]/g, "")}`} className={linkClasses}>
                            {thread.lead.phone}
                        </a>
                    ) : (
                        <span className="text-stone-500">{t("leads.detail.notProvided")}</span>
                    )}
                </PanelRow>
            </dl>
            {NEXT_STAGE[thread.lead.stage] ? (
                <form action={advanceLeadAction.bind(null, thread.lead.id, NEXT_STAGE[thread.lead.stage]!)}>
                    <SubmitButton variant="secondary" className="w-full" pendingLabel={t("messages.panel.moving")}>
                        {t("messages.panel.moveTo", { stage: tLeads(`stages.${NEXT_STAGE[thread.lead.stage]!}`) })}
                    </SubmitButton>
                </form>
            ) : (
                <Button href={leadHref(thread.lead.id)} variant="secondary" className="w-full">
                    {t("messages.thread.openLead")}
                </Button>
            )}
        </aside>
    );

    return (
        <>
            <PageHeader title={t("messages.title")} subtitle={t("messages.subtitle")} />
            <div className="flex min-w-0 overflow-hidden rounded-2xl border border-line bg-white lg:h-[min(760px,calc(100vh-13rem))] lg:min-h-130">
                {list}
                {threadPane}
                {panel}
            </div>
        </>
    );
}

function PanelRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="mb-1 text-xs font-semibold tracking-[0.4px] text-stone-500 uppercase">{label}</dt>
            <dd className="text-sm text-stone-900">{children}</dd>
        </div>
    );
}
