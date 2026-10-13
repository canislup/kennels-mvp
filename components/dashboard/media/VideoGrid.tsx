"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Play } from "lucide-react";
import { addVideoLinkAction, deleteMediaAction, updateMediaAction } from "@/app/[locale]/dashboard/media/actions";
import type { MediaFilterOptions, MediaItem } from "@/lib/dashboard/types";
import Card from "@/components/dashboard/ui/Card";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import FormModal from "@/components/dashboard/ui/FormModal";
import StatusMenu from "@/components/dashboard/ui/StatusMenu";
import TextInput from "@/components/dashboard/ui/TextInput";
import TagFields from "./TagFields";

/** Videos tab: link cards (open on YouTube/Vimeo in a new tab), Add video link, and per-video Edit / Delete. */
export default function VideoGrid({ items, options, filtered }: { items: MediaItem[]; options: MediaFilterOptions; filtered: boolean }) {
    const t = useTranslations("dashboard.media");
    const tErrors = useTranslations("dashboard.common.errors");
    const [editing, setEditing] = useState<MediaItem | null>(null);
    const [deleting, setDeleting] = useState<MediaItem | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function confirmDelete() {
        if (!deleting) return;
        startTransition(async () => {
            const result = await deleteMediaAction([deleting.id]);
            if (result.ok) setDeleting(null);
            else setDeleteError(tErrors(result.formError?.key ?? "generic", result.formError?.params));
        });
    }

    const titleField = (error: (field: string) => string | undefined, id: string, name: "title" | "caption", defaultValue = "") => (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                {t("videos.title")}
            </label>
            <TextInput id={id} name={name} defaultValue={defaultValue} maxLength={120} aria-invalid={error(name) ? true : undefined} aria-describedby={error(name) ? `${id}-error` : undefined} />
            {error(name) && (
                <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-status-red">
                    {error(name)}
                </p>
            )}
        </div>
    );

    return (
        <Card as="section" aria-labelledby="media-videos-heading">
            <div className="mb-4.5 flex flex-wrap items-center justify-between gap-3">
                <h2 id="media-videos-heading" className="font-display text-xl font-bold">
                    {t("videos.heading")}
                </h2>
                <FormModal
                    title={t("videos.addTitle")}
                    description={t("videos.addDescription")}
                    action={addVideoLinkAction}
                    submitLabel={t("videos.addSubmit")}
                    pendingLabel={t("videos.adding")}
                    cancelLabel={t("cancel")}
                    trigger={(open) => (
                        <button
                            type="button"
                            onClick={open}
                            className="rounded-xl border border-accent-soft bg-accent-soft px-3.5 py-2 text-[13px] font-semibold text-accent hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                            {t("videos.add")}
                        </button>
                    )}
                >
                    {({ error }) => (
                        <div className="flex flex-col gap-4">
                            <div>
                                <label htmlFor="video-url" className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                                    {t("videos.url")}
                                </label>
                                <TextInput
                                    id="video-url"
                                    name="url"
                                    type="url"
                                    inputMode="url"
                                    placeholder="https://www.youtube.com/watch?v=…"
                                    aria-invalid={error("url") ? true : undefined}
                                    aria-describedby={error("url") ? "video-url-error" : "video-url-help"}
                                />
                                {error("url") ? (
                                    <p id="video-url-error" className="mt-1.5 text-xs font-medium text-status-red">
                                        {error("url")}
                                    </p>
                                ) : (
                                    <p id="video-url-help" className="mt-1.5 text-xs text-stone-500">
                                        {t("videos.urlHelp")}
                                    </p>
                                )}
                            </div>
                            {titleField(error, "video-title", "title")}
                            <TagFields idPrefix="video-add" options={options} error={error} />
                        </div>
                    )}
                </FormModal>
            </div>

            {items.length === 0 ? (
                <EmptyState compact title={filtered ? t("empty.filteredVideos") : t("empty.videos")} description={filtered ? undefined : t("empty.videosHelp")} />
            ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4.5">
                    {items.map((video) => {
                        const title = video.caption || t("videos.untitled");
                        return (
                            <li key={video.id}>
                                <a
                                    href={video.url ?? "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                    <span className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[14px] bg-linear-135 from-sand-light to-sand-dark">
                                        {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                                        <span className="relative flex size-12 items-center justify-center rounded-full bg-white/90 text-stone-900 transition-transform group-hover:scale-105" aria-hidden>
                                            <Play className="size-5 fill-current" />
                                        </span>
                                    </span>
                                    <span className="sr-only">
                                        {title} {t("videos.opensNewTab")}
                                    </span>
                                </a>
                                <div className="mt-2.5 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-stone-900">{title}</div>
                                        <div className="mt-0.5 text-xs text-stone-500">
                                            {t("videos.meta", { provider: t(`videos.providers.${video.provider ?? "YOUTUBE"}`), breed: video.breed ?? t("tags.allBreeds") })}
                                        </div>
                                    </div>
                                    <StatusMenu
                                        variant="icon"
                                        kind="actions"
                                        icon={<MoreHorizontal className="size-4" aria-hidden />}
                                        value=""
                                        options={[
                                            { value: "edit", label: t("photo.edit") },
                                            { value: "delete", label: t("photo.delete") },
                                        ]}
                                        onSelect={(action) => (action === "edit" ? setEditing(video) : setDeleting(video))}
                                        triggerLabels={{ "": t("photo.actions", { name: title }) }}
                                        menuLabel={t("photo.actions", { name: title })}
                                        failedMessage=""
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <FormModal
                key={editing?.id ?? "none"}
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
                title={t("edit.videoTitle")}
                action={updateMediaAction.bind(null, editing?.id ?? "")}
                submitLabel={t("edit.save")}
                pendingLabel={t("edit.saving")}
                cancelLabel={t("cancel")}
            >
                {({ error }) => (
                    <div className="flex flex-col gap-4">
                        {titleField(error, "video-edit-title", "caption", editing?.caption ?? "")}
                        <TagFields idPrefix="video-edit" options={options} defaultBreed={editing?.breed} defaultDogId={editing?.dogId} error={error} />
                    </div>
                )}
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                tone="danger"
                title={t("delete.videoTitle", { name: deleting?.caption ?? "" })}
                description={t("delete.videoDescription")}
                confirmLabel={pending ? t("delete.pending") : t("delete.confirm")}
                cancelLabel={t("cancel")}
                pending={pending}
                error={deleteError}
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDeleting(null);
                    setDeleteError(null);
                }}
            />
        </Card>
    );
}
