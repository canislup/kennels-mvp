/**
 * Horizontal progress track. `value` is 0–100. `valueText` is what screen
 * readers announce (e.g. "33% placed"); `barClassName` colors the fill.
 */
export default function ProgressBar({
    value,
    label,
    valueText,
    barClassName = "bg-accent",
    className = "",
}: {
    value: number;
    label: string;
    valueText?: string;
    barClassName?: string;
    className?: string;
}) {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={valueText}
            className={`h-2 overflow-hidden rounded-full bg-stone-100 ${className}`}
        >
            <div className={`h-full rounded-full transition-[width] ${barClassName}`} style={{ width: `${clamped}%` }} />
        </div>
    );
}
