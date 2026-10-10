"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import ImageUploader from "@/components/dashboard/ui/ImageUploader";
import { notifyFormChange } from "@/components/dashboard/ui/SaveBar";

/**
 * Up to `max` photos; the first is the cover. Reorder by dragging or with the
 * move-earlier/later buttons (keyboard and touch). Submits one hidden
 * `photoUrls` input per photo, in order.
 */
export default function PhotoManager({ initialPhotos, max, error }: { initialPhotos: string[]; max: number; error?: string }) {
    const t = useTranslations("dashboard.dogs.form.photos");
    const [photos, setPhotos] = useState(initialPhotos);
    const [announcement, setAnnouncement] = useState("");
    const dragFrom = useRef<number | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        notifyFormChange(rootRef.current);
    }, [photos]);

    function move(from: number, to: number) {
        if (to < 0 || to >= photos.length || from === to) return;
        setPhotos((current) => {
            const next = [...current];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item!);
            return next;
        });
        setAnnouncement(t("moved", { from: from + 1, to: to + 1, total: photos.length }));
    }

    function remove(index: number) {
        setPhotos((current) => current.filter((_, i) => i !== index));
        setAnnouncement(t("removed", { position: index + 1 }));
    }

    return (
        <div ref={rootRef}>
            <div className="mb-3.5 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">{t("heading")}</h2>
                <span className="text-xs text-stone-500">{t("count", { count: photos.length, max })}</span>
            </div>
            {error && (
                <p tabIndex={-1} data-error-focus className="mb-3 text-xs font-medium text-status-red focus:outline-none">
                    {error}
                </p>
            )}
            <ul className="grid grid-cols-3 gap-2.5">
                {photos.map((url, index) => (
                    <li
                        key={`${url}-${index}`}
                        draggable
                        onDragStart={(event) => {
                            dragFrom.current = index;
                            event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            event.preventDefault();
                            if (dragFrom.current !== null) move(dragFrom.current, index);
                            dragFrom.current = null;
                        }}
                        className={`group relative aspect-square cursor-grab overflow-hidden rounded-xl border-2 bg-stone-100 active:cursor-grabbing ${index === 0 ? "border-accent" : "border-transparent"}`}
                    >
                        <img src={url} alt={t("photoAlt", { position: index + 1 })} className="h-full w-full object-cover" draggable={false} />
                        <input type="hidden" name="photoUrls" value={url} />
                        {index === 0 && (
                            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">{t("cover")}</span>
                        )}
                        <button
                            type="button"
                            onClick={() => remove(index)}
                            aria-label={t("remove", { position: index + 1 })}
                            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-stone-900/65 text-white hover:bg-stone-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                        >
                            <X className="size-3.5" aria-hidden />
                        </button>
                        <div className="absolute right-1.5 bottom-1.5 flex gap-1 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                            {[
                                { to: index - 1, icon: ChevronLeft, label: t("moveEarlier", { position: index + 1 }) },
                                { to: index + 1, icon: ChevronRight, label: t("moveLater", { position: index + 1 }) },
                            ].map(({ to, icon: Icon, label }) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => move(index, to)}
                                    disabled={to < 0 || to >= photos.length}
                                    aria-label={label}
                                    className="flex size-6 items-center justify-center rounded-full bg-white/90 text-stone-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-accent disabled:hidden"
                                >
                                    <Icon className="size-3.5" aria-hidden />
                                </button>
                            ))}
                        </div>
                    </li>
                ))}
                {photos.length < max && (
                    <li>
                        <ImageUploader maxFiles={max - photos.length} onUpload={(image) => setPhotos((current) => (current.length < max ? [...current, image.url] : current))}>
                            {(open) => (
                                <button
                                    type="button"
                                    onClick={open}
                                    className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-xs font-semibold text-accent transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                    <Plus className="size-5" strokeWidth={2} aria-hidden />
                                    {t("add")}
                                </button>
                            )}
                        </ImageUploader>
                    </li>
                )}
            </ul>
            <p className="mt-1.5 text-xs text-stone-500">{t("help")}</p>
            <p className="sr-only" role="status" aria-live="polite">
                {announcement}
            </p>
        </div>
    );
}
