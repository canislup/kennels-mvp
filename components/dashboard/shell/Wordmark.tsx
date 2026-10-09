import { Link } from "@/i18n/navigation";

export default function Wordmark({ className = "" }: { className?: string }) {
    return (
        <Link
            href="/dashboard"
            className={`rounded font-display text-2xl font-bold tracking-[-0.3px] text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
        >
            Kennel<span className="text-accent">OS</span>
        </Link>
    );
}
