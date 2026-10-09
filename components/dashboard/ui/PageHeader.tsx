import type { ReactNode } from "react";

/** Page title (Playfair), optional subtitle, and right-aligned actions. */
export default function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                <h1 className="mb-1.5 font-display text-[26px] leading-tight font-bold text-stone-900 sm:text-[32px]">{title}</h1>
                {subtitle && <p className="text-[15px] text-stone-600">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
        </div>
    );
}
