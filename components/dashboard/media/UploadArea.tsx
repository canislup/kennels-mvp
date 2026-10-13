"use client";

import { useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { addPhotosAction } from "@/app/[locale]/dashboard/media/actions";
import type { PhotoUpload } from "@/lib/dashboard/types";
import Button from "@/components/dashboard/ui/Button";
import ImageUploader from "@/components/dashboard/ui/ImageUploader";

const FORMATS = ["jpg", "jpeg", "png", "webp"];
const MAX_FILES = 20;

/**
 * "Upload photos" header button + the dashed upload area. Both open the
 * Cloudinary widget (which has its own drop area). Once its queue is done,
 * the uploaded photos are saved in one call, then the page shows the result
 * as a one-time `?notice=` banner (either trigger can start the upload, and
 * new photos go at the end, often on another page).
 */
export default function UploadArea({ variant }: { variant: "button" | "area" }) {
    const t = useTranslations("dashboard.media.upload");
    const pendingUploads = useRef<PhotoUpload[]>([]);
    const router = useRouter();
    const [saving, startSaving] = useTransition();

    function save() {
        const uploads = pendingUploads.current;
        pendingUploads.current = [];
        if (uploads.length === 0) return;
        startSaving(async () => {
            const result = await addPhotosAction(uploads);
            router.replace(result.ok ? `/dashboard/media?notice=photosAdded&added=${uploads.length}` : "/dashboard/media?notice=photosFailed");
        });
    }

    return (
        <ImageUploader
            maxFiles={MAX_FILES}
            formats={FORMATS}
            onUpload={(image) => pendingUploads.current.push({ url: image.url, width: image.width, height: image.height })}
            onQueueEnd={save}
        >
            {(open) =>
                variant === "button" ? (
                    <Button onClick={open} disabled={saving} aria-busy={saving}>
                        {saving ? t("saving") : t("button")}
                    </Button>
                ) : (
                    <div className="mb-7">
                        <button
                            type="button"
                            onClick={open}
                            disabled={saving}
                            className="flex w-full flex-wrap items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-line-strong bg-white p-7 text-center transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                        >
                            <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
                                <ImagePlus className="size-5" />
                            </span>
                            <span className="text-left">
                                <span className="block text-[15px] font-semibold text-stone-900">{saving ? t("saving") : t("areaTitle")}</span>
                                <span className="block text-[13px] text-stone-500">{t("areaHelp", { max: MAX_FILES })}</span>
                            </span>
                        </button>
                    </div>
                )
            }
        </ImageUploader>
    );
}
