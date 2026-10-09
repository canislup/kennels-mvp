import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "green" | "amber" | "blue" | "pink" | "red" | "accent";

const TONES: Record<BadgeTone, string> = {
    neutral: "bg-stone-100 text-stone-700",
    green: "bg-status-green-bg text-status-green",
    amber: "bg-status-amber-bg text-status-amber",
    blue: "bg-status-blue-bg text-status-blue",
    pink: "bg-status-pink-bg text-status-pink",
    red: "bg-status-red-bg text-status-red",
    accent: "bg-accent text-white",
};

/** Pill label. Always carries text, so color is never the only signal. */
export default function Badge({ tone = "neutral", className = "", children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] leading-4 font-semibold ${TONES[tone]} ${className}`}>
            {children}
        </span>
    );
}
