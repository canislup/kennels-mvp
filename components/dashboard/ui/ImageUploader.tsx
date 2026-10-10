"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CldUploadWidget } from "next-cloudinary";

export type UploadedImage = { url: string; fileName: string };

/**
 * Cloudinary upload widget (same unsigned preset the dashboard has always
 * used), images only. Calls `onUpload` once per uploaded file; `children`
 * renders the trigger with an `open` function. The returned URLs are stored
 * through lib/dashboard, never written to the database from here.
 */
export default function ImageUploader({
    onUpload,
    maxFiles = 1,
    children,
}: {
    onUpload: (image: UploadedImage) => void;
    maxFiles?: number;
    children: (open: () => void) => ReactNode;
}) {
    // next-cloudinary creates the widget once and keeps the callbacks it was
    // created with, so always call the latest onUpload through a ref.
    const onUploadRef = useRef(onUpload);
    useEffect(() => {
        onUploadRef.current = onUpload;
    });

    return (
        <CldUploadWidget
            uploadPreset="kennel_app_preset"
            options={{
                multiple: maxFiles > 1,
                maxFiles,
                resourceType: "image",
                clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "heic"],
                maxFileSize: 10_000_000,
                sources: ["local", "camera", "url"],
            }}
            onSuccess={(result) => {
                const info = result.info;
                if (typeof info === "object" && info?.secure_url) {
                    const name = info.original_filename ? `${info.original_filename}.${info.format ?? "jpg"}` : info.secure_url.split("/").pop()!;
                    onUploadRef.current({ url: info.secure_url, fileName: name });
                }
            }}
        >
            {({ open }) => children(() => open())}
        </CldUploadWidget>
    );
}
