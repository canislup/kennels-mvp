import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
    // Only run on page routes: excludes /api/*, /_next/*, and any path
    // with a file extension (favicon, images, other static assets).
    matcher: ["/((?!api|_next|.*\\..*).*)"],
};
