"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { periodForHour, TIME_ZONE_COOKIE, type DayPeriod } from "./dayPeriod";

const subscribe = () => () => {};

/**
 * "Good morning/afternoon/evening, {name}" in the viewer's local time.
 * The server renders `serverPeriod` (computed from the time-zone cookie this
 * component sets, falling back to server time); after hydration React switches
 * to the browser's own hour if it differs, so there's no hydration mismatch.
 */
export default function Greeting({ firstName, serverPeriod }: { firstName: string; serverPeriod: DayPeriod }) {
    const t = useTranslations("dashboard.overview.greeting");
    const period = useSyncExternalStore(
        subscribe,
        () => periodForHour(new Date().getHours()),
        () => serverPeriod,
    );

    // Remember the browser's time zone so the next server render is already right.
    useEffect(() => {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (zone) document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
    }, []);

    return <>{t(period, { name: firstName })}</>;
}
