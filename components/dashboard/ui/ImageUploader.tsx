"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CldUploadWidget } from "next-cloudinary";

export type UploadedImage = { url: string; fileName: string; width?: number; height?: number; publicId?: string };

const DEFAULT_FORMATS = ["jpg", "jpeg", "png", "webp", "heic"];

/**
 * Cloudinary upload widget (same unsigned preset the dashboard has always
 * used), images only. Calls `onUpload` once per uploaded file and, when
 * given, `onQueueEnd` once the whole batch is done (to save several files in
 * one call). `cropAspectRatio` turns on the widget's own cropping step
 * (single file only): the returned URL then delivers the cropped area
 * (`c_crop,g_custom`). `children` renders the trigger with an `open` function. The
 * returned URLs are stored through lib/dashboard, never written to the
 * database from here.
 */
export default function ImageUploader({
    onUpload,
    onQueueEnd,
    maxFiles = 1,
    formats = DEFAULT_FORMATS,
    cropAspectRatio,
    children,
}: {
    onUpload: (image: UploadedImage) => void;
    onQueueEnd?: () => void;
    maxFiles?: number;
    /** Allowed file extensions (checked by the widget before uploading). */
    formats?: string[];
    /** Width / height, e.g. 1 for a square logo. Only with maxFiles = 1. */
    cropAspectRatio?: number;
    children: (open: () => void) => ReactNode;
}) {
    // next-cloudinary creates the widget once and keeps the callbacks it was
    // created with, so always call the latest ones through refs.
    const onUploadRef = useRef(onUpload);
    const onQueueEndRef = useRef(onQueueEnd);
    useEffect(() => {
        onUploadRef.current = onUpload;
        onQueueEndRef.current = onQueueEnd;
    });

    return (
        <CldUploadWidget
            uploadPreset="kennel_app_preset"
            options={{
                multiple: maxFiles > 1,
                maxFiles,
                resourceType: "image",
                clientAllowedFormats: formats,
                maxFileSize: 10_000_000,
                sources: ["local", "camera", "url"],
                ...(cropAspectRatio && maxFiles === 1 ? { cropping: true, croppingAspectRatio: cropAspectRatio, showSkipCropButton: false, croppingShowDimensions: true } : {}),
            }}
            onSuccess={(result) => {
                const info = result.info;
                if (typeof info === "object" && info?.secure_url) {
                    const name = info.original_filename ? `${info.original_filename}.${info.format ?? "jpg"}` : info.secure_url.split("/").pop()!;
                    // With cropping, Cloudinary stores the chosen area as custom coordinates; deliver just that area.
                    const cropped = Boolean((info as { coordinates?: { custom?: unknown } }).coordinates?.custom);
                    const url = cropped ? info.secure_url.replace("/upload/", "/upload/c_crop,g_custom/") : info.secure_url;
                    onUploadRef.current({ url, fileName: name, width: info.width, height: info.height, publicId: info.public_id });
                }
            }}
            onQueuesEnd={() => onQueueEndRef.current?.()}
        >
            {({ open }) => children(() => open())}
        </CldUploadWidget>
    );
}
