"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Cloudinary serves a still frame of a video when the extension is swapped
// to .jpg; other hosts get the gradient placeholder instead.
function posterFor(url: string) {
    return url.includes("res.cloudinary.com") && url.endsWith(".mp4") ? url.replace(/\.mp4$/, ".jpg") : null;
}

// Poster + play button until clicked, then the real player — so the page
// doesn't load every video up front.
export default function ProfileVideoTile({ url, gradient }: { url: string; gradient: string }) {
    const t = useTranslations("public.kennel.videos");
    const [playing, setPlaying] = useState(false);
    const poster = posterFor(url);

    if (playing) {
        return (
            <video
                src={url}
                poster={poster ?? undefined}
                controls
                autoPlay
                playsInline
                className="h-40 w-full flex-1 rounded-xl bg-[#1C1917] object-cover"
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={t("play")}
            className={`relative flex h-40 w-full flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-xl ${gradient}`}
        >
            {poster && <img src={poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
            <span className="relative flex size-11 items-center justify-center rounded-full bg-[rgba(28,25,23,0.55)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                </svg>
            </span>
        </button>
    );
}
