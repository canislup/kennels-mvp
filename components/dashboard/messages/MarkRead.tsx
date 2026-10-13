"use client";

import { useEffect, useRef, useTransition } from "react";
import { markReadAction } from "@/app/[locale]/dashboard/messages/actions";

/**
 * Marks an opened conversation read once its thread is actually on screen
 * (never during server render), then the action refreshes the page (list
 * badges, sidebar). Skips a thread that is rendered but hidden (display:none).
 */
export default function MarkRead({ conversationId, targetId }: { conversationId: string; targetId: string }) {
    const [, startTransition] = useTransition();
    const done = useRef<string | null>(null);

    useEffect(() => {
        if (done.current === conversationId) return;
        const target = document.getElementById(targetId);
        if (!target || target.offsetParent === null) return;
        done.current = conversationId;
        startTransition(async () => {
            await markReadAction(conversationId);
        });
    }, [conversationId, targetId]);

    return null;
}
