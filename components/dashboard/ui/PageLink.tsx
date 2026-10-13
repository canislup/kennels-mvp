import { Link } from "@/i18n/navigation";

/** Previous / Next link for URL-driven pagination; a disabled look when `href` is null. */
export default function PageLink({ href, label }: { href: string | null; label: string }) {
    const classes = "rounded-xl border border-line-strong bg-white px-4 py-2.25 text-[13px] font-medium";
    if (!href) {
        return (
            <span aria-disabled="true" className={`${classes} cursor-not-allowed text-stone-400`}>
                {label}
            </span>
        );
    }
    return (
        <Link href={href} className={`${classes} text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}>
            {label}
        </Link>
    );
}
