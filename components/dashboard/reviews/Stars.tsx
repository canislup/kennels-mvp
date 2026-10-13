import { Star } from "lucide-react";

/**
 * Five stars filled to the nearest whole star. One accessible name for the
 * whole row (`label`, e.g. "4.9 out of 5"); the icons are decorative.
 */
export default function Stars({ rating, label, size = "md", className = "" }: { rating: number; label: string; size?: "md" | "lg"; className?: string }) {
    const filled = Math.round(rating);
    const icon = size === "lg" ? "size-4.5" : "size-4";
    return (
        <span role="img" aria-label={label} className={`inline-flex gap-0.5 ${className}`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} aria-hidden className={`${icon} ${i <= filled ? "fill-status-amber-solid text-status-amber-solid" : "fill-line text-line"}`} strokeWidth={1.5} />
            ))}
        </span>
    );
}
