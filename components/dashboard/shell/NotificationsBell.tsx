"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import type { DashboardNotification } from "@/lib/dashboard/types";

type NotificationT = ReturnType<typeof useTranslations<"dashboard.shell.notifications">>;

/** Title + detail in the viewer's language, from the stored type + params. */
function notificationText(n: DashboardNotification, t: NotificationT): { title: string; detail: string } {
    switch (n.type) {
        case "NEW_LEAD":
            return { title: t("types.newLead.title", n.params), detail: t("types.newLead.detail") };
        case "NEW_MESSAGE":
            return { title: t("types.newMessage.title", n.params), detail: t("types.newMessage.detail", n.params) };
        case "NEW_REVIEW":
            return { title: t("types.newReview.title", { rating: n.params.rating }), detail: t("types.newReview.detail", n.params) };
        case "FOLLOW_UP_DUE":
            return { title: t("types.followUpDue.title"), detail: t("types.followUpDue.detail", n.params) };
        case "VERIFICATION_REMINDER":
            return { title: t("types.verificationReminder.title"), detail: t("types.verificationReminder.detail") };
    }
}
import { formatRelativeTime } from "../relativeTime";

/** Bell with an unread dot and a small popover listing the latest notifications. */
export default function NotificationsBell({ notifications }: { notifications: DashboardNotification[] }) {
    const t = useTranslations("dashboard.shell.notifications");
    const tTime = useTranslations("dashboard.common.time");
    const format = useFormatter();
    // Non-null while open; also the "now" for relative times in the list.
    const [openedAt, setOpenedAt] = useState<number | null>(null);
    const open = openedAt !== null;
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelId = useId();
    const unread = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpenedAt(null);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpenedAt(null);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpenedAt(open ? null : Date.now())}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={unread > 0 ? t("buttonUnread", { count: unread }) : t("button")}
                className="relative flex size-10 items-center justify-center rounded-full border border-line bg-white text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
                <Bell className="size-4.5" strokeWidth={1.8} aria-hidden />
                {unread > 0 && (
                    <span className="absolute top-2 right-2.25 size-2.25 rounded-full border-2 border-white bg-status-red-strong" aria-hidden />
                )}
            </button>

            {open && (
                <div
                    id={panelId}
                    role="region"
                    aria-label={t("title")}
                    className="absolute top-12 right-0 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white shadow-md"
                >
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <h2 className="font-display text-base font-bold text-stone-900">{t("title")}</h2>
                        {unread > 0 && <span className="text-xs text-stone-500">{t("unreadCount", { count: unread })}</span>}
                    </div>
                    {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-stone-500">{t("empty")}</p>
                    ) : (
                        <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                            {notifications.map((n) => {
                                const { title, detail } = notificationText(n, t);
                                return (
                                <li key={n.id} className="flex gap-3 px-4 py-3">
                                    <span
                                        className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`}
                                        aria-hidden
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm text-stone-900 ${n.read ? "font-normal" : "font-semibold"}`}>
                                            {title}
                                            {!n.read && <span className="sr-only"> ({t("unread")})</span>}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-stone-500">{detail}</p>
                                        <p className="mt-1 text-xs text-stone-500">
                                            <time dateTime={n.createdAt}>{formatRelativeTime(format, tTime, n.createdAt, new Date(openedAt))}</time>
                                        </p>
                                    </div>
                                </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
