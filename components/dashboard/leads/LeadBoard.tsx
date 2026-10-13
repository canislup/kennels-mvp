"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { moveLeadStageAction } from "@/app/[locale]/dashboard/leads/actions";
import type { LeadStage } from "@/lib/dashboard/types";
import Notice from "@/components/dashboard/ui/Notice";
import StatusMenu from "@/components/dashboard/ui/StatusMenu";
import { DUE_BADGE, LEAD_STAGE_ORDER, STAGE_DOT } from "./leadMeta";
import type { LeadCardView } from "./leadView";

export type LeadColumnView = { stage: LeadStage; count: number; truncated: boolean; cards: LeadCardView[] };

type Move = { id: string; to: LeadStage };

/** Moves a card to the top of another column (it's now the most recently active). */
function applyMove(columns: LeadColumnView[], { id, to }: Move): LeadColumnView[] {
    const card = columns.flatMap((column) => column.cards).find((c) => c.id === id);
    if (!card || card.stage === to) return columns;
    return columns.map((column) => {
        if (column.stage === card.stage) return { ...column, count: column.count - 1, cards: column.cards.filter((c) => c.id !== id) };
        if (column.stage === to) return { ...column, count: column.count + 1, cards: [{ ...card, stage: to }, ...column.cards] };
        return column;
    });
}

/**
 * The pipeline board. Cards move by native drag-and-drop (desktop) or the
 * "Move to…" menu on each card (keyboard, touch, everyone). A move shows
 * immediately (useOptimistic), then the Server Action saves it and refreshes
 * the board in the same round trip; on failure the card snaps back and an
 * error notice appears. Every move is announced to screen readers.
 */
export default function LeadBoard({ columns, olderSoldHref }: { columns: LeadColumnView[]; olderSoldHref: string }) {
    const t = useTranslations("dashboard.leads");
    const [shown, addMove] = useOptimistic(columns, applyMove);
    const [, startTransition] = useTransition();
    const [announcement, setAnnouncement] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<LeadStage | null>(null);
    const dragged = useRef<string | null>(null);

    function move(id: string, to: LeadStage) {
        const card = shown.flatMap((column) => column.cards).find((c) => c.id === id);
        if (!card || card.stage === to) return;
        setError(null);
        startTransition(async () => {
            addMove({ id, to });
            const result = await moveLeadStageAction(id, to);
            if (result.ok) {
                setAnnouncement(t("board.moved", { name: card.name, stage: t(`stages.${to}`) }));
            } else {
                setError(t("board.moveFailed", { name: card.name }));
                setAnnouncement(t("board.moveFailed", { name: card.name }));
            }
        });
    }

    const stageOptions = LEAD_STAGE_ORDER.map((stage) => ({ value: stage, label: t(`stages.${stage}`) }));

    return (
        <>
            {error && (
                <Notice key={error} tone="error" className="mb-4">
                    {error}
                </Notice>
            )}
            <p className="sr-only" role="status" aria-live="polite">
                {announcement}
            </p>
            {/* Columns scroll sideways inside this box on small screens; the page itself never does. */}
            <div className="relative overflow-x-auto pb-4">
                <div className="flex min-w-max items-start gap-4">
                    {shown.map((column) => {
                        const headingId = `lead-column-${column.stage}`;
                        const isTarget = dropTarget === column.stage;
                        return (
                            <section
                                key={column.stage}
                                aria-labelledby={headingId}
                                onDragOver={(event) => {
                                    if (!dragged.current) return;
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = "move";
                                    if (dropTarget !== column.stage) setDropTarget(column.stage);
                                }}
                                onDragLeave={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    const id = dragged.current;
                                    dragged.current = null;
                                    setDropTarget(null);
                                    if (id) move(id, column.stage);
                                }}
                                className={`w-68 shrink-0 rounded-2xl border p-3 transition-colors ${
                                    isTarget ? "border-accent bg-accent-soft" : "border-line bg-stone-50"
                                }`}
                            >
                                <div className="flex items-center justify-between px-2 pt-1.5 pb-3">
                                    <h2 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                                        <span className={`size-2.5 rounded-full ${STAGE_DOT[column.stage]}`} aria-hidden />
                                        {t(`stages.${column.stage}`)}
                                    </h2>
                                    <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                                        <span aria-hidden>{column.count}</span>
                                        <span className="sr-only">{t("board.columnCount", { count: column.count })}</span>
                                    </span>
                                </div>
                                <ul className="flex min-h-12 flex-col gap-2.5">
                                    {column.cards.map((card) => (
                                        <li key={card.id} className="relative">
                                            <Link
                                                href={card.href}
                                                draggable
                                                onDragStart={(event) => {
                                                    dragged.current = card.id;
                                                    event.dataTransfer.effectAllowed = "move";
                                                    event.dataTransfer.setData("text/plain", card.name);
                                                }}
                                                onDragEnd={() => {
                                                    dragged.current = null;
                                                    setDropTarget(null);
                                                }}
                                                className="block cursor-grab rounded-xl border border-line bg-white p-3.5 pr-10 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:cursor-grabbing"
                                            >
                                                <span className="mb-1.5 flex items-center gap-2">
                                                    <span className="min-w-0 truncate text-sm font-semibold text-stone-900">{card.name}</span>
                                                    {card.unread && (
                                                        <span className="size-2 shrink-0 rounded-full bg-accent">
                                                            <span className="sr-only">{t("card.unread")}</span>
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="mb-3 block text-[13px] text-stone-600">{card.interest}</span>
                                                <span className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="rounded-full bg-stone-100 px-2.25 py-0.75 text-[11px] font-semibold text-stone-600">{card.sourceLabel}</span>
                                                    {card.followUp ? (
                                                        <span className={`rounded-full px-2.25 py-0.75 text-[11px] font-semibold ${DUE_BADGE[card.followUp.tone]}`}>{card.followUp.label}</span>
                                                    ) : (
                                                        <span className="text-[11px] text-stone-500">{card.activity}</span>
                                                    )}
                                                </span>
                                            </Link>
                                            <div className="absolute top-2.5 right-2.5">
                                                <StatusMenu
                                                    variant="icon"
                                                    icon={<ArrowRightLeft className="size-3.5" aria-hidden />}
                                                    value={card.stage}
                                                    options={stageOptions}
                                                    onSelect={(to) => move(card.id, to as LeadStage)}
                                                    triggerLabels={Object.fromEntries(LEAD_STAGE_ORDER.map((stage) => [stage, t("card.moveTo", { name: card.name })]))}
                                                    menuLabel={t("card.moveMenu", { name: card.name })}
                                                    failedMessage={t("board.moveFailed", { name: card.name })}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                {column.cards.length === 0 && <p className="px-2 py-3 text-center text-xs text-stone-500">{t("board.emptyColumn")}</p>}
                                {column.truncated && (
                                    <Link
                                        href={olderSoldHref}
                                        className="mt-3 block rounded px-2 text-xs font-semibold text-accent hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                    >
                                        {t("board.olderSold")}
                                    </Link>
                                )}
                            </section>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
