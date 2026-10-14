"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, ImagePlus } from "lucide-react";
import Button from "@/components/dashboard/ui/Button";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import ImageUploader from "@/components/dashboard/ui/ImageUploader";
import { notifyFormChange } from "@/components/dashboard/ui/SaveBar";

type Picked = { url: string; publicId: string };

const COVER_ASPECT = 3; // width / height, the wide public-page banner
const FORMATS = ["jpg", "jpeg", "png", "webp"];

/**
 * Logo (square) and cover (wide), each uploaded and cropped in the Cloudinary
 * widget. Submits through hidden inputs (URL + publicId). A saved logo can only
 * be replaced; the cover can also be removed, after a confirmation.
 */
export default function ProfileImages({
    logo: initialLogo,
    cover: initialCover,
    logoError,
    coverError,
}: {
    logo: Picked;
    cover: Picked;
    logoError?: string;
    coverError?: string;
}) {
    const t = useTranslations("dashboard.settings.profile.images");
    const [logo, setLogo] = useState(initialLogo);
    const [cover, setCover] = useState(initialCover);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Hidden inputs changed from state: tell the SaveBar (and the live preview).
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        notifyFormChange(rootRef.current);
    }, [logo, cover]);

    return (
        <div ref={rootRef} className="mt-5.5 flex flex-wrap gap-6">
            <input type="hidden" name="logoUrl" value={logo.url} />
            <input type="hidden" name="logoPublicId" value={logo.publicId} />
            <input type="hidden" name="coverUrl" value={cover.url} />
            <input type="hidden" name="coverPublicId" value={cover.publicId} />

            <div id="profile-logo" className="flex-none scroll-mt-24">
                <span className="mb-1.5 block text-[13px] font-semibold text-stone-700">{t("logo")}</span>
                <div className="flex items-center gap-3.5">
                    {logo.url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary (or legacy) URL, shown as is like the rest of the dashboard
                        <img src={logo.url} alt={t("logoAlt")} className="size-21 rounded-[18px] border border-line object-cover" />
                    ) : (
                        <div className="size-21 rounded-[18px] border border-line bg-linear-135 from-sand-light to-sand-dark" aria-hidden />
                    )}
                    <ImageUploader formats={FORMATS} cropAspectRatio={1} onUpload={(image) => setLogo({ url: image.url, publicId: image.publicId ?? "" })}>
                        {(open) => (
                            <Button
                                variant="secondary"
                                onClick={open}
                                aria-describedby={logoError ? "profile-logo-error" : "profile-logo-help"}
                                data-error-focus={logoError ? "" : undefined}
                                className="px-3.5 py-2.25 text-[13px]"
                            >
                                {logo.url ? t("replace") : t("uploadLogo")}
                            </Button>
                        )}
                    </ImageUploader>
                </div>
                <p id="profile-logo-help" className="mt-1.5 text-xs text-stone-500">
                    {t("logoHelp")}
                </p>
                {logoError && <ImageError id="profile-logo-error" message={logoError} />}
            </div>

            <div id="profile-cover" className="min-w-0 flex-[1_1_280px] scroll-mt-24">
                <span className="mb-1.5 block text-[13px] font-semibold text-stone-700">{t("cover")}</span>
                <div className="relative h-30 overflow-hidden rounded-[14px] border border-line">
                    {cover.url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary (or legacy) URL, shown as is like the rest of the dashboard
                        <img src={cover.url} alt={t("coverAlt")} className="size-full object-cover" />
                    ) : (
                        <div className="flex size-full items-center justify-center bg-linear-135 from-sand-light to-sand-dark text-white" aria-hidden>
                            <ImagePlus className="size-6 opacity-80" />
                        </div>
                    )}
                    <div className="absolute right-2.5 bottom-2.5 flex gap-2">
                        {cover.url && (
                            <button
                                type="button"
                                onClick={() => setConfirmRemove(true)}
                                className="rounded-lg bg-white px-3 py-1.75 text-xs font-semibold text-status-red shadow-sm hover:bg-status-red-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                                {t("remove")}
                            </button>
                        )}
                        <ImageUploader formats={FORMATS} cropAspectRatio={COVER_ASPECT} onUpload={(image) => setCover({ url: image.url, publicId: image.publicId ?? "" })}>
                            {(open) => (
                                <button
                                    id="profile-cover-upload"
                                    type="button"
                                    onClick={open}
                                    aria-describedby={coverError ? "profile-cover-error profile-cover-help" : "profile-cover-help"}
                                    data-error-focus={coverError ? "" : undefined}
                                    className="rounded-lg bg-white px-3 py-1.75 text-xs font-semibold text-stone-900 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                    {cover.url ? t("replaceAndCrop") : t("uploadCover")}
                                </button>
                            )}
                        </ImageUploader>
                    </div>
                </div>
                <p id="profile-cover-help" className="mt-1.5 text-xs text-stone-500">
                    {t("coverHelp")}
                </p>
                {coverError && <ImageError id="profile-cover-error" message={coverError} />}
            </div>

            <ConfirmDialog
                open={confirmRemove}
                title={t("removeCoverTitle")}
                description={t("removeCoverDescription")}
                confirmLabel={t("removeCoverConfirm")}
                cancelLabel={t("cancel")}
                tone="danger"
                onConfirm={() => {
                    setCover({ url: "", publicId: "" });
                    setConfirmRemove(false);
                    // The Remove button is gone: put focus on "Upload a cover" instead of the page.
                    requestAnimationFrame(() => document.getElementById("profile-cover-upload")?.focus());
                }}
                onCancel={() => setConfirmRemove(false)}
            />
        </div>
    );
}

function ImageError({ id, message }: { id: string; message: string }) {
    return (
        <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-status-red">
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            {message}
        </p>
    );
}
