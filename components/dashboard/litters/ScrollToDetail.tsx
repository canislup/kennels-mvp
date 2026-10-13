"use client";

import { useEffect } from "react";
import { LITTER_DETAIL_ID } from "./litterMeta";

/**
 * Below `lg` the detail renders under the list, so after choosing a litter
 * (links end in #litter-detail) scroll to it. On desktop, where the detail
 * sits beside the list, nothing moves.
 */
export default function ScrollToDetail({ litterId }: { litterId: string }) {
    useEffect(() => {
        if (window.location.hash !== `#${LITTER_DETAIL_ID}`) return;
        if (window.matchMedia("(min-width: 64rem)").matches) return;
        document.getElementById(LITTER_DETAIL_ID)?.scrollIntoView({ block: "start" });
    }, [litterId]);
    return null;
}
