import { notFound } from "next/navigation";

/** Unknown /dashboard/* URLs: render the dashboard's not-found page inside the shell. */
export default function UnknownDashboardPage() {
    notFound();
}
