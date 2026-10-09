/** Horizontal progress track. `value` is 0–100. */
export default function ProgressBar({ value, label, className = "" }: { value: number; label: string; className?: string }) {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            className={`h-2 overflow-hidden rounded-full bg-stone-100 ${className}`}
        >
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${clamped}%` }} />
        </div>
    );
}
