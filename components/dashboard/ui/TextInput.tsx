import type { ComponentProps } from "react";
import { CONTROL_CLASSES } from "./formStyles";

export default function TextInput({ className = "", type = "text", ...props }: ComponentProps<"input">) {
    return <input type={type} {...props} className={`${CONTROL_CLASSES} ${className}`} />;
}
