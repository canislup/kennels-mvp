import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BASE =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4.5 py-2.75 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    secondary: "border border-line-strong bg-white text-stone-900 hover:bg-stone-50",
    ghost: "text-stone-700 hover:bg-stone-100 hover:text-stone-900",
    danger: "bg-status-red-bg text-status-red hover:bg-status-red-strong hover:text-white",
};

type CommonProps = { variant?: ButtonVariant; className?: string; children: ReactNode };
type AsLink = CommonProps & { href: ComponentProps<typeof Link>["href"] } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;
type AsButton = CommonProps & { href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">;

/** Renders a locale-aware <Link> when given `href`, otherwise a <button>. */
export default function Button({ variant = "primary", className = "", children, ...rest }: AsLink | AsButton) {
    const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

    if (rest.href !== undefined) {
        return (
            <Link {...(rest as Omit<AsLink, keyof CommonProps>)} className={classes}>
                {children}
            </Link>
        );
    }
    const { type = "button", ...buttonProps } = rest as Omit<AsButton, keyof CommonProps>;
    return (
        <button type={type} {...buttonProps} className={classes}>
            {children}
        </button>
    );
}
