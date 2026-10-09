import type { ComponentProps, ElementType } from "react";

type CardProps<T extends ElementType> = { as?: T; padding?: "none" | "md" | "lg" } & Omit<ComponentProps<T>, "as">;

const PADDING = { none: "", md: "p-5", lg: "p-6" } as const;

/** The bordered white surface. Separation comes from the border, never a shadow. */
export default function Card<T extends ElementType = "div">({ as, padding = "lg", className = "", ...props }: CardProps<T>) {
    const Component: ElementType = as ?? "div";
    return <Component {...props} className={`rounded-2xl border border-line bg-white ${PADDING[padding]} ${className}`} />;
}
