import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export type Crumb = { label: string; href?: string };

/**
 * Breadcrumb for the top bar's left slot. Pages provide it through the
 * @breadcrumb parallel route; it truncates instead of wrapping on small screens.
 */
export default async function Breadcrumb({ items }: { items: Crumb[] }) {
    const t = await getTranslations("dashboard.shell");
    return (
        <nav aria-label={t("breadcrumbLabel")} data-breadcrumb className="min-w-0">
            <ol className="flex min-w-0 items-center text-[13px] text-stone-500">
                {items.map((item, index) => {
                    const last = index === items.length - 1;
                    return (
                        <li key={index} className={`flex items-center ${last ? "min-w-0" : "shrink-0"}`}>
                            {index > 0 && (
                                <span className="mx-2 text-stone-400" aria-hidden>
                                    /
                                </span>
                            )}
                            {item.href && !last ? (
                                <Link
                                    href={item.href}
                                    className="rounded hover:text-stone-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="truncate font-medium text-stone-900" aria-current={last ? "page" : undefined}>
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
