"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { deleteMediaAction, moveMediaAction, tagMediaAction, updateMediaAction } from "@/app/[locale]/dashboard/media/actions";
import type { MediaFilterOptions, MediaItem } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import FormModal from "@/components/dashboard/ui/FormModal";
import Notice from "@/components/dashboard/ui/Notice";
import StatusMenu from "@/components/dashboard/ui/StatusMenu";
import TextInput from "@/components/dashboard/ui/TextInput";
import TagFields from "./TagFields";

type Move = { id: string; to: number };

/** Shifts global positions as if `id` moved to `to`, then re-sorts the page. */
function applyMove(items: MediaItem[], { id, to }: Move): MediaItem[] {
    const moved = items.find((item) => item.id === id);
    if (!moved) return items;
    const from = moved.position;
    return items
        .map((item) => {
            if (item.id === id) return { ...item, position: to };
            if (from < to && item.position > from && item.position <= to) return { ...item, position: item.position - 1 };
            if (from > to && item.position >= to && item.position < from) return { ...item, position: item.position + 1 };
            return item;
        })
        .sort((a, b) => a.position - b.position);
}

/**
 * The photo grid: selection + bulk bar, per-photo "…" menu (edit, move,
 * delete), and drag-to-reorder. Positions are global (MediaItem.position),
 * so menu moves work on any page; dragging is offered only when the list is
 * unfiltered (`canDrag`), where the page is a contiguous slice.
 */
export default function PhotoGrid({ items, totalPhotos, canDrag, options }: { items: MediaItem[]; totalPhotos: number; canDrag: boolean; options: MediaFilterOptions }) {
    const t = useTranslations("dashboard.media");
    const tErrors = useTranslations("dashboard.common.errors");
    const [shown, addMove] = useOptimistic(items, applyMove);
    const [, startTransition] = useTransition();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [editing, setEditing] = useState<MediaItem | null>(null);
    const [tagging, setTagging] = useState(false);
    const [deleting, setDeleting] = useState<string[] | null>(null);
    const [deletePending, startDelete] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [announcement, setAnnouncement] = useState("");
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const dragged = useRef<string | null>(null);

    // Keep only ids still on the page (after deletes or paging).
    const pageIds = new Set(items.map((item) => item.id));
    const selectedIds = [...selected].filter((id) => pageIds.has(id));
    const label = (item: MediaItem) => item.caption || t("photo.untitled", { position: item.position + 1 });

    function toggle(id: string) {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function move(item: MediaItem, to: number) {
        if (to === item.position || to < 0 || to >= totalPhotos) return;
        setError(null);
        startTransition(async () => {
            addMove({ id: item.id, to });
            const result = await moveMediaAction(item.id, to);
            if (result.ok) setAnnouncement(t("photo.moved", { name: label(item), position: to + 1, total: totalPhotos }));
            else setError(t("photo.moveFailed"));
        });
    }

    function onMenu(item: MediaItem, action: string) {
        if (action === "edit") setEditing(item);
        else if (action === "earlier") move(item, item.position - 1);
        else if (action === "later") move(item, item.position + 1);
        else if (action === "start") move(item, 0);
        else if (action === "delete") setDeleting([item.id]);
    }

    function confirmDelete() {
        const ids = deleting ?? [];
        startDelete(async () => {
            const result = await deleteMediaAction(ids);
            if (result.ok) {
                setDeleting(null);
                setSelected(new Set());
                setAnnouncement(t("photo.deleted", { count: ids.length }));
            } else setError(tErrors(result.formError?.key ?? "generic", result.formError?.params));
        });
    }

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

            {selectedIds.length > 0 && (
                <div className="sticky top-18 z-10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-soft bg-accent-soft px-4 py-2.5 lg:top-3">
                    <span className="text-sm font-semibold text-accent" aria-live="polite">
                        {t("bulk.selected", { count: selectedIds.length })}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="px-3.5 py-1.75 text-[13px]" onClick={() => setSelected(new Set(items.map((item) => item.id)))}>
                            {t("bulk.selectPage")}
                        </Button>
                        <Button variant="secondary" className="px-3.5 py-1.75 text-[13px]" onClick={() => setTagging(true)}>
                            {t("bulk.tag")}
                        </Button>
                        <Button variant="danger" className="px-3.5 py-1.75 text-[13px]" onClick={() => setDeleting(selectedIds)}>
                            {t("bulk.delete")}
                        </Button>
                        <Button variant="ghost" className="px-3.5 py-1.75 text-[13px]" onClick={() => setSelected(new Set())}>
                            {t("bulk.clear")}
                        </Button>
                    </div>
                </div>
            )}

            <ul className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4.5">
                {shown.map((item, index) => {
                    const isSelected = selected.has(item.id);
                    const actions = [
                        { value: "edit", label: t("photo.edit") },
                        ...(item.position > 0 ? [{ value: "earlier", label: t("photo.moveEarlier") }] : []),
                        ...(item.position < totalPhotos - 1 ? [{ value: "later", label: t("photo.moveLater") }] : []),
                        ...(item.position > 0 ? [{ value: "start", label: t("photo.moveStart") }] : []),
                        { value: "delete", label: t("photo.delete") },
                    ];
                    return (
                        <li
                            key={item.id}
                            onDragOver={(event) => {
                                if (!canDrag || !dragged.current) return;
                                event.preventDefault();
                                if (dropIndex !== index) setDropIndex(index);
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                const id = dragged.current;
                                dragged.current = null;
                                setDropIndex(null);
                                const source = shown.find((s) => s.id === id);
                                if (source) move(source, item.position);
                            }}
                        >
                            <figure className="m-0">
                                <div
                                    className={`relative aspect-4/3 overflow-hidden rounded-[14px] bg-linear-135 from-sand-light to-sand-dark ${
                                        isSelected ? "outline-3 -outline-offset-3 outline-accent" : ""
                                    } ${dropIndex === index ? "ring-2 ring-accent ring-offset-2" : ""}`}
                                >
                                    {item.url && <img src={item.url} alt={item.caption ?? ""} loading="lazy" className="h-full w-full object-cover" draggable={false} />}
                                    <label className="absolute top-2.5 left-2.5 flex size-6 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow-sm">
                                        <input type="checkbox" checked={isSelected} onChange={() => toggle(item.id)} className="size-4 accent-accent" />
                                        <span className="sr-only">{t("photo.select", { name: label(item) })}</span>
                                    </label>
                                    {canDrag && (
                                        <span
                                            draggable
                                            onDragStart={(event) => {
                                                dragged.current = item.id;
                                                event.dataTransfer.effectAllowed = "move";
                                                event.dataTransfer.setData("text/plain", label(item));
                                            }}
                                            onDragEnd={() => {
                                                dragged.current = null;
                                                setDropIndex(null);
                                            }}
                                            title={t("photo.dragHint")}
                                            aria-hidden
                                            className="absolute top-2.5 right-2.5 flex size-7 cursor-grab items-center justify-center rounded-md bg-stone-900/45 text-white active:cursor-grabbing"
                                        >
                                            <GripVertical className="size-4" />
                                        </span>
                                    )}
                                </div>
                                <figcaption className="px-0.5 pt-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className={`min-w-0 text-[13px] font-medium ${item.caption ? "text-stone-900" : "text-stone-400"}`}>{label(item)}</span>
                                        <StatusMenu
                                            variant="icon"
                                            kind="actions"
                                            icon={<MoreHorizontal className="size-4" aria-hidden />}
                                            value=""
                                            options={actions}
                                            onSelect={(action) => onMenu(item, action)}
                                            triggerLabels={{ "": t("photo.actions", { name: label(item) }) }}
                                            menuLabel={t("photo.actions", { name: label(item) })}
                                            failedMessage=""
                                        />
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        <span className={`rounded-full px-2.25 py-0.5 text-[11px] font-semibold ${item.breed ? "bg-stone-100 text-stone-700" : "bg-stone-50 text-stone-500"}`}>
                                            {item.breed ?? t("tags.allBreeds")}
                                        </span>
                                        <span className={`rounded-full px-2.25 py-0.5 text-[11px] font-semibold ${item.dogName ? "bg-accent-soft text-accent" : "bg-stone-50 text-stone-500"}`}>
                                            {item.dogName ?? t("tags.wholeKennel")}
                                        </span>
                                    </div>
                                </figcaption>
                            </figure>
                        </li>
                    );
                })}
            </ul>

            {/* Keyed by the item / selection so each opening binds the right ids. */}
            <FormModal
                key={editing?.id ?? "none"}
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
                title={t("edit.title")}
                action={updateMediaAction.bind(null, editing?.id ?? "")}
                submitLabel={t("edit.save")}
                pendingLabel={t("edit.saving")}
                cancelLabel={t("cancel")}
            >
                {({ error: fieldError }) => (
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="media-caption" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                                {t("edit.caption")}
                            </label>
                            <TextInput
                                id="media-caption"
                                name="caption"
                                defaultValue={editing?.caption ?? ""}
                                maxLength={120}
                                aria-invalid={fieldError("caption") ? true : undefined}
                                aria-describedby={fieldError("caption") ? "media-caption-error" : undefined}
                            />
                            {fieldError("caption") && (
                                <p id="media-caption-error" className="mt-1.5 text-xs font-medium text-status-red">
                                    {fieldError("caption")}
                                </p>
                            )}
                        </div>
                        <TagFields idPrefix="media-edit" options={options} defaultBreed={editing?.breed} defaultDogId={editing?.dogId} error={fieldError} />
                    </div>
                )}
            </FormModal>

            <FormModal
                key={`tag-${selectedIds.join(",")}`}
                open={tagging}
                onOpenChange={setTagging}
                onSuccess={() => {
                    setSelected(new Set());
                    setAnnouncement(t("bulk.tagged", { count: selectedIds.length }));
                }}
                title={t("bulk.tagTitle", { count: selectedIds.length })}
                description={t("bulk.tagDescription")}
                action={tagMediaAction.bind(null, selectedIds)}
                submitLabel={t("bulk.tagSubmit")}
                pendingLabel={t("edit.saving")}
                cancelLabel={t("cancel")}
            >
                {({ error: fieldError }) => <TagFields idPrefix="media-bulk" options={options} error={fieldError} />}
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                tone="danger"
                title={t("delete.title", { count: deleting?.length ?? 0 })}
                description={t("delete.description", { count: deleting?.length ?? 0 })}
                confirmLabel={deletePending ? t("delete.pending") : t("delete.confirm")}
                cancelLabel={t("cancel")}
                pending={deletePending}
                onConfirm={confirmDelete}
                onCancel={() => setDeleting(null)}
            />
        </>
    );
}
