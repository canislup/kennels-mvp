import type { MessageDirection } from "@/lib/dashboard/types";

/**
 * One chat bubble. INBOUND (the buyer) sits left on stone-50; OUTBOUND (the
 * kennel) sits right on the accent tint. Shared by the lead page and the
 * Messages screen (Step 5). `meta` is a small line under the text (time).
 */
export default function MessageBubble({ direction, children, meta, label }: { direction: MessageDirection; children: React.ReactNode; meta?: React.ReactNode; /** Screen-reader prefix, e.g. "Marina wrote:". */ label: string }) {
    const inbound = direction === "INBOUND";
    return (
        <div
            className={`max-w-[90%] px-3 py-2.5 text-[13px] leading-normal wrap-break-word ${
                inbound ? "self-start rounded-[12px_12px_12px_4px] border border-line bg-stone-50 text-stone-900" : "self-end rounded-[12px_12px_4px_12px] bg-accent-soft text-stone-900"
            }`}
        >
            <span className="sr-only">{label} </span>
            {children}
            {meta && <div className="mt-1 text-[11px] text-stone-500">{meta}</div>}
        </div>
    );
}
