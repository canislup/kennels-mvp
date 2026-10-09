import type { ReactNode } from "react";

/**
 * Friendly empty or placeholder block. `compact` is for empty lists inside a
 * card; the default is a standalone dashed panel (also used for sections that
 * haven't been redesigned yet).
 */
export default function EmptyState({
    title,
    description,
    action,
    icon,
    compact = false,
}: {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    icon?: ReactNode;
    compact?: boolean;
}) {
    return (
        <div
            className={
                compact
                    ? "px-2 py-6 text-center"
                    : "flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white px-6 py-16 text-center"
            }
        >
            {icon && (
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
                    {icon}
                </div>
            )}
            <p className={compact ? "text-sm font-medium text-stone-700" : "font-display text-xl font-bold text-stone-900"}>{title}</p>
            {description && <p className={`mx-auto max-w-md text-sm text-stone-500 ${compact ? "mt-1" : "mt-2"}`}>{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
