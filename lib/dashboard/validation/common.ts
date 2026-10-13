// REAL LOGIC: keep when the backend lands. Small checks shared by several validators.

/** A pragmatic "looks like an email" check (the real proof is a verification email). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_MAX = 254;

/** A trimmed string field from FormData ("" when missing or a file). */
export function textField(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

/** A raw string field (not trimmed: passwords). */
export function rawField(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
}
