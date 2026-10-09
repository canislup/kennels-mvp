import { Playfair_Display, Work_Sans } from "next/font/google";

// Public marketplace typography (Home / Directory / Profile designs):
// Playfair Display for headings, Work Sans for body and UI.
export const playfair = Playfair_Display({
    subsets: ["latin"],
    weight: ["500", "600", "700"],
    variable: "--font-playfair",
});

export const workSans = Work_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-work-sans",
});

// Apply to a public page's root element.
export const publicFontClasses = `${playfair.variable} ${workSans.variable} font-(family-name:--font-work-sans)`;

// Apply to the dashboard layout root. Body text uses Work Sans; headings and
// numbers opt in with `font-display` (Playfair Display). Both are wired to
// these variables in app/globals.css.
export const dashboardFontClasses = `${playfair.variable} ${workSans.variable} font-body`;
