"use client";

import { useEffect } from "react";

/** Scrolls the thread to its latest message on load and whenever a new one arrives. */
export default function ScrollToLatest({ scrollerId, lastMessageId }: { scrollerId: string; lastMessageId: string | null }) {
    useEffect(() => {
        const scroller = document.getElementById(scrollerId);
        if (!scroller) return;
        if (scroller.scrollHeight > scroller.clientHeight) {
            // Desktop: the thread scrolls inside its pane.
            scroller.scrollTop = scroller.scrollHeight;
        } else if (window.location.search.includes("conversation=")) {
            // Mobile: the page scrolls; bring the last message into view.
            scroller.lastElementChild?.scrollIntoView({ block: "end" });
        }
    }, [scrollerId, lastMessageId]);
    return null;
}
