import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

// English is the source of truth (see CLAUDE.md sec. 7): any key not yet
// translated for a locale falls back to its English value instead of
// throwing, so pages don't break while pt-BR.json is filled in gradually.
function withEnglishFallback(defaults: Messages, overrides: Messages): Messages {
    const merged: Messages = { ...defaults };
    for (const key of Object.keys(overrides)) {
        const defaultValue = defaults[key];
        const overrideValue = overrides[key];
        const bothAreObjects =
            defaultValue &&
            overrideValue &&
            typeof defaultValue === "object" &&
            typeof overrideValue === "object" &&
            !Array.isArray(defaultValue) &&
            !Array.isArray(overrideValue);

        merged[key] = bothAreObjects
            ? withEnglishFallback(defaultValue as Messages, overrideValue as Messages)
            : overrideValue;
    }
    return merged;
}

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale;

    const defaultMessages = (await import(`../messages/${routing.defaultLocale}.json`)).default;
    const messages =
        locale === routing.defaultLocale
            ? defaultMessages
            : withEnglishFallback(defaultMessages, (await import(`../messages/${locale}.json`)).default);

    return { locale, messages };
});
