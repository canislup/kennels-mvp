import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentKennel } from "@/lib/dashboard/kennel";
import { getLeadDetail, getReservablePuppies, getWaitlistOptions } from "@/lib/dashboard/leads";
import { daysBetween, getViewerToday } from "@/lib/dashboard/viewerDate";
import { moveLeadStageAction, removeFromWaitlistAction, reopenLeadAction } from "../actions";
import Card from "@/components/dashboard/ui/Card";
import Notice from "@/components/dashboard/ui/Notice";
import StatusMenu from "@/components/dashboard/ui/StatusMenu";
import SubmitButton from "@/components/dashboard/ui/SubmitButton";
import MessageBubble from "@/components/dashboard/messages/MessageBubble";
import FollowUpActions from "@/components/dashboard/leads/detail/FollowUpActions";
import LeadHeaderActions from "@/components/dashboard/leads/detail/LeadHeaderActions";
import NoteForm from "@/components/dashboard/leads/detail/NoteForm";
import ReservationBlock from "@/components/dashboard/leads/detail/ReservationBlock";
import Timeline from "@/components/dashboard/leads/detail/Timeline";
import WaitlistAdd from "@/components/dashboard/leads/detail/WaitlistAdd";
import { LEAD_STAGE_ORDER } from "@/components/dashboard/leads/leadMeta";
import { formatRelativeTime } from "@/components/dashboard/relativeTime";
import { fromDateOnly } from "@/components/dashboard/dateOnly";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
    const [{ id }, kennel] = await Promise.all([params, getCurrentKennel()]);
    const lead = kennel ? await getLeadDetail(kennel.id, id) : null;
    return { title: lead?.name };
}

const linkClasses =
    "rounded font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
};

/** The lead page: who they are, what they want, what happened, and what's next. */
export default async function LeadDetailPage({ params, searchParams }: Props) {
    const [{ id }, query, kennel] = await Promise.all([params, searchParams, getCurrentKennel()]);
    if (!kennel) notFound();
    const history = query.history === "all" ? "all" : "recent";
    const [lead, t, tLeads, tTime, format, today] = await Promise.all([
        getLeadDetail(kennel.id, id, { history }),
        getTranslations("dashboard.leads.detail"),
        getTranslations("dashboard.leads"),
        getTranslations("dashboard.common.time"),
        getFormatter(),
        getViewerToday(),
    ]);
    if (!lead) notFound();
    const [reservable, waitlistOptions] = await Promise.all([getReservablePuppies(kennel.id, lead.id), getWaitlistOptions(kennel.id, lead.id)]);

    const firstName = lead.name.split(/\s+/)[0] ?? lead.name;
    const isLost = lead.stage === "LOST";
    const place = [lead.city, lead.state].filter(Boolean).join(", ");
    const subline = [place, t("since", { date: format.dateTime(new Date(lead.createdAt), { dateStyle: "medium" }) })].filter(Boolean).join(" · ");
    const stageIndex = LEAD_STAGE_ORDER.indexOf(lead.stage as (typeof LEAD_STAGE_ORDER)[number]);

    // Follow-up card state, from date-only values.
    const dueIn = lead.followUpAt ? daysBetween(today, lead.followUpAt) : null;
    const followUpTone = dueIn === null ? "none" : dueIn <= 0 ? "due" : "upcoming";
    const followUpText =
        dueIn === null
            ? t("followUp.none")
            : dueIn < 0
              ? t("followUp.overdue", { days: -dueIn })
              : dueIn === 0
                ? t("followUp.today", { date: format.dateTime(fromDateOnly(lead.followUpAt!), { day: "numeric", month: "short" }) })
                : t("followUp.upcoming", { date: format.dateTime(fromDateOnly(lead.followUpAt!), { weekday: "long", day: "numeric", month: "short" }) });

    const notice = query.notice === "saved" ? t("notices.saved") : null;
    const whatsapp = lead.phone ? lead.phone.replace(/\D/g, "") : "";
    const contactRows = [
        { key: "email", value: lead.email && <a href={`mailto:${lead.email}`} className={`text-sm ${linkClasses}`}>{lead.email}</a> },
        { key: "phone", value: lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className={`text-sm ${linkClasses}`}>{lead.phone}</a> },
        {
            key: "preferred",
            value: (
                <span className="flex flex-wrap items-center gap-x-2 text-sm text-stone-900">
                    {tLeads(`contact.${lead.preferredContact}`)}
                    {lead.preferredContact === "WHATSAPP" && whatsapp && (
                        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={`text-[13px] ${linkClasses}`}>
                            {t("contact.openWhatsapp")}
                            <span className="sr-only"> {t("contact.newTab")}</span>
                        </a>
                    )}
                </span>
            ),
        },
    ];

    const lookingFor = [
        { key: "breed", value: lead.interestBreed },
        { key: "preference", value: lead.interestNote },
        { key: "litter", value: lead.litter && <Link href={`/dashboard/litters?litter=${lead.litter.id}`} className={linkClasses}>{lead.litter.name}</Link> },
        { key: "dog", value: lead.dog && <Link href={`/dashboard/dogs/${lead.dog.id}/edit`} className={linkClasses}>{lead.dog.name}</Link> },
        { key: "source", value: tLeads(`sources.${lead.source}`) },
    ];

    return (
        <>
            {notice && (
                <Notice tone="success" clearParam="notice" className="mb-5">
                    {notice}
                </Notice>
            )}

            {/* Summary */}
            <Card as="section" aria-labelledby="lead-name" className="mb-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xl font-bold text-accent" aria-hidden>
                            {initials(lead.name)}
                        </span>
                        <div className="min-w-0">
                            <h1 id="lead-name" className="mb-1 font-display text-[26px] leading-tight font-bold text-stone-900 sm:text-[28px]">
                                {lead.name}
                            </h1>
                            <p className="text-sm text-stone-600">{subline}</p>
                        </div>
                    </div>
                    <LeadHeaderActions leadId={lead.id} leadName={lead.name} isLost={isLost} heldDogName={lead.reservation?.dogName ?? null} reservable={reservable} />
                </div>

                {isLost ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-strong bg-stone-50 px-4 py-3">
                        <p className="text-sm text-stone-700">
                            <strong className="font-semibold text-stone-900">{t("lostBanner.title")}</strong>{" "}
                            {lead.lostReason && t("lostBanner.reason", { reason: tLeads(`lostReasons.${lead.lostReason}`) })}
                        </p>
                        <form action={reopenLeadAction.bind(null, lead.id)}>
                            <SubmitButton variant="secondary" className="px-4 py-2 text-[13px]" pendingLabel={t("lostBanner.reopening")}>
                                {t("lostBanner.reopen")}
                            </SubmitButton>
                        </form>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-end gap-4">
                        <ol aria-label={t("stage.label")} className="grid min-w-0 flex-1 basis-80 grid-cols-3 gap-2 sm:grid-cols-6">
                            {LEAD_STAGE_ORDER.map((stage, index) => {
                                const current = index === stageIndex;
                                return (
                                    <li key={stage} aria-current={current ? "step" : undefined} className="text-center">
                                        <div className={`mb-2 h-1.5 rounded-full ${index <= stageIndex ? "bg-accent" : "bg-line"}`} aria-hidden />
                                        <div className={`text-[13px] ${current ? "font-bold text-stone-900" : index < stageIndex ? "font-medium text-stone-600" : "font-medium text-stone-500"}`}>
                                            {tLeads(`stages.${stage}`)}
                                            {index < stageIndex && <span className="sr-only"> ({t("stage.done")})</span>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                        <StatusMenu
                            variant="button"
                            buttonText={t("stage.change")}
                            value={lead.stage}
                            options={LEAD_STAGE_ORDER.map((stage) => ({ value: stage, label: tLeads(`stages.${stage}`) }))}
                            action={moveLeadStageAction.bind(null, lead.id)}
                            triggerLabels={Object.fromEntries(LEAD_STAGE_ORDER.map((stage) => [stage, t("stage.changeLabel", { stage: tLeads(`stages.${stage}`) })]))}
                            menuLabel={t("stage.menu", { name: lead.name })}
                            failedMessage={t("stage.failed")}
                        />
                    </div>
                )}
            </Card>

            <div className="flex flex-wrap items-start gap-6">
                {/* Left column */}
                <div className="flex min-w-0 flex-[2_1_480px] flex-col gap-6">
                    <Card as="section" aria-labelledby="lead-looking-for">
                        <h2 id="lead-looking-for" className="mb-4.5 font-display text-xl font-bold">
                            {t("lookingFor.heading", { name: firstName })}
                        </h2>
                        <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-5">
                            {lookingFor.map((row) => (
                                <div key={row.key}>
                                    <dt className="mb-1 text-xs font-semibold tracking-[0.4px] text-stone-500 uppercase">{t(`lookingFor.${row.key}`)}</dt>
                                    <dd className="text-[15px] font-medium text-stone-900">{row.value || <span className="font-normal text-stone-500">{t("notProvided")}</span>}</dd>
                                </div>
                            ))}
                        </dl>
                        {lead.firstMessage && (
                            <figure className="mt-5 rounded-xl border border-line bg-stone-50 p-3.5">
                                <figcaption className="mb-1 text-xs font-semibold tracking-[0.4px] text-stone-500 uppercase">{t("lookingFor.firstMessage", { name: firstName })}</figcaption>
                                <blockquote className="text-sm leading-relaxed text-stone-700">{lead.firstMessage}</blockquote>
                            </figure>
                        )}
                    </Card>

                    <Card as="section" aria-labelledby="lead-timeline">
                        <h2 id="lead-timeline" className="mb-4 font-display text-xl font-bold">
                            {t("notes.heading")}
                        </h2>
                        <NoteForm leadId={lead.id} firstName={firstName} />
                        <Timeline items={lead.timeline} leadFirstName={firstName} />
                        {lead.timelineHasMore && (
                            <Link href={`/dashboard/leads/${lead.id}?history=all`} scroll={false} className={`mt-2 inline-block text-[13px] ${linkClasses}`}>
                                {t("timeline.showAll")}
                            </Link>
                        )}
                    </Card>
                </div>

                {/* Right column */}
                <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
                    <section
                        aria-labelledby="lead-follow-up"
                        className={`rounded-2xl border bg-white p-6 ${followUpTone === "due" ? "border-status-amber-solid" : "border-line"}`}
                    >
                        <h2 id="lead-follow-up" tabIndex={-1} className="mb-2.5 font-display text-xl font-bold focus:outline-none">
                            {t("followUp.heading")}
                        </h2>
                        <p
                            className={`mb-3 text-sm font-semibold ${
                                dueIn !== null && dueIn < 0 ? "text-status-red" : followUpTone === "due" ? "text-status-amber" : followUpTone === "upcoming" ? "text-stone-900" : "text-stone-500"
                            }`}
                        >
                            {followUpText}
                        </p>
                        <FollowUpActions leadId={lead.id} followUpAt={lead.followUpAt} today={today} headingId="lead-follow-up" canSchedule={!isLost} />
                    </section>

                    {lead.reservation && <ReservationBlock leadId={lead.id} leadName={lead.name} dogId={lead.reservation.dogId} dogName={lead.reservation.dogName} />}

                    <Card as="section" aria-labelledby="lead-contact">
                        <h2 id="lead-contact" className="mb-4 font-display text-xl font-bold">
                            {t("contact.heading")}
                        </h2>
                        <dl className="flex flex-col gap-3.5">
                            {contactRows.map((row) => (
                                <div key={row.key}>
                                    <dt className="mb-0.5 text-xs font-semibold tracking-[0.4px] text-stone-500 uppercase">{t(`contact.${row.key}`)}</dt>
                                    <dd className="break-words">{row.value || <span className="text-sm text-stone-500">{t("notProvided")}</span>}</dd>
                                </div>
                            ))}
                        </dl>
                    </Card>

                    <Card as="section" aria-labelledby="lead-waitlist">
                        <h2 id="lead-waitlist" className="mb-3 font-display text-xl font-bold">
                            {t("waitlist.heading")}
                        </h2>
                        {lead.waitlists.length === 0 ? (
                            <p className="text-sm text-stone-500">{t("waitlist.empty", { name: firstName })}</p>
                        ) : (
                            <ul className="flex flex-col">
                                {lead.waitlists.map((entry) => (
                                    <li key={entry.entryId} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                                        <span className="flex size-7.5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
                                            <span className="sr-only">{t("waitlist.position")} </span>
                                            {entry.position}
                                        </span>
                                        <Link href={`/dashboard/litters?litter=${entry.litterId}`} className={`min-w-0 flex-1 truncate text-sm ${linkClasses}`}>
                                            {entry.litterName}
                                        </Link>
                                        <form action={removeFromWaitlistAction.bind(null, entry.entryId)}>
                                            <SubmitButton variant="ghost" className="px-2.5 py-1.5 text-[13px] font-medium text-stone-500" pendingLabel={t("waitlist.removing")}>
                                                {t("waitlist.remove")}
                                                <span className="sr-only"> {t("waitlist.removeFrom", { litter: entry.litterName })}</span>
                                            </SubmitButton>
                                        </form>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <WaitlistAdd leadId={lead.id} leadName={lead.name} options={waitlistOptions} />
                    </Card>

                    <Card as="section" aria-labelledby="lead-conversation">
                        <div className="mb-3.5 flex items-center justify-between">
                            <h2 id="lead-conversation" className="font-display text-xl font-bold">
                                {t("conversation.heading")}
                            </h2>
                            {lead.recentMessages.length > 0 && (
                                <Link href={`/dashboard/messages?lead=${lead.id}`} className={`text-[13px] ${linkClasses}`}>
                                    {t("conversation.open")}
                                    <span className="sr-only"> {t("conversation.openFull", { name: lead.name })}</span>
                                </Link>
                            )}
                        </div>
                        {lead.recentMessages.length === 0 ? (
                            <p className="text-sm text-stone-500">
                                {t("conversation.empty")}{" "}
                                <Link href={`/dashboard/messages?lead=${lead.id}`} className={linkClasses}>
                                    {t("sendMessage")}
                                </Link>
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {lead.recentMessages.map((message) => (
                                    <MessageBubble
                                        key={message.id}
                                        direction={message.direction}
                                        label={message.direction === "INBOUND" ? t("conversation.theyWrote", { name: firstName }) : t("conversation.youWrote")}
                                        meta={
                                            <>
                                                {formatRelativeTime(format, tTime, message.createdAt, new Date())}
                                                {message.direction === "INBOUND" && !message.readAt && <span className="ml-1.5 font-semibold text-accent">· {t("conversation.unread")}</span>}
                                            </>
                                        }
                                    >
                                        {message.body}
                                        {message.sharedDog && (
                                            <span className={`block font-medium ${message.body ? "mt-1" : ""}`}>{t("conversation.sharedDog", { dog: message.sharedDog.name })}</span>
                                        )}
                                    </MessageBubble>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
}
