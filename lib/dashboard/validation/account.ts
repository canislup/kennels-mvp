// REAL LOGIC: keep when the backend lands. Server-side rules for the Account
// tab: details, password change, account deletion. Errors are translation
// keys (dashboard.common.errors.*) + params.
import type { Account, AppLocale, FieldError, PasswordChangeInput } from "../types";
import { EMAIL_MAX, EMAIL_PATTERN, rawField, textField } from "./common";

export const ACCOUNT_LIMITS = { fullName: 80, email: EMAIL_MAX, passwordMin: 8, passwordMax: 200 } as const;

export const APP_LOCALES: readonly AppLocale[] = ["en", "pt-BR"];

export function parseAccountDetails(formData: FormData): Account {
    return { fullName: textField(formData, "fullName"), email: textField(formData, "email").toLowerCase(), locale: textField(formData, "locale") as AppLocale };
}

export function validateAccountDetails(values: Account): Record<string, FieldError> {
    const errors: Record<string, FieldError> = {};
    if (!values.fullName) errors.fullName = { key: "required" };
    else if (values.fullName.length > ACCOUNT_LIMITS.fullName) errors.fullName = { key: "tooLong", params: { max: ACCOUNT_LIMITS.fullName } };
    if (!values.email) errors.email = { key: "required" };
    else if (values.email.length > ACCOUNT_LIMITS.email || !EMAIL_PATTERN.test(values.email)) errors.email = { key: "invalidEmail" };
    if (!APP_LOCALES.includes(values.locale)) errors.locale = { key: "invalidChoice" };
    return errors;
}

/** Passwords are never trimmed (spaces are allowed) and never sent back to the browser. */
export function parsePasswordChange(formData: FormData): PasswordChangeInput {
    return { currentPassword: rawField(formData, "currentPassword"), newPassword: rawField(formData, "newPassword"), confirmPassword: rawField(formData, "confirmPassword") };
}

export function validatePasswordChange(input: PasswordChangeInput): Record<string, FieldError> {
    const errors: Record<string, FieldError> = {};
    if (!input.currentPassword) errors.currentPassword = { key: "required" };
    if (input.newPassword.length < ACCOUNT_LIMITS.passwordMin) errors.newPassword = { key: "passwordTooShort", params: { min: ACCOUNT_LIMITS.passwordMin } };
    else if (input.newPassword.length > ACCOUNT_LIMITS.passwordMax) errors.newPassword = { key: "tooLong", params: { max: ACCOUNT_LIMITS.passwordMax } };
    else if (input.currentPassword && input.newPassword === input.currentPassword) errors.newPassword = { key: "passwordUnchanged" };
    if (!errors.newPassword && input.confirmPassword !== input.newPassword) errors.confirmPassword = { key: "passwordMismatch" };
    return errors;
}

/** Deleting the account: the typed name must equal the kennel's name exactly (case-sensitive). */
export function validateDeletionConfirm(confirmName: string, kennelName: string): FieldError | undefined {
    if (!confirmName) return { key: "required" };
    if (confirmName !== kennelName) return { key: "confirmNameMismatch" };
    return undefined;
}
