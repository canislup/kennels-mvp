"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function SignupPage() {
    const router = useRouter();
    const t = useTranslations("auth.signup");
    const tAuth = useTranslations("auth");

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (formData: FormData) => {
        setIsLoading(true);
        setError("");

        const fullName = formData.get("fullName");
        const email = formData.get("email");
        const phoneNumber = formData.get("phoneNumber");
        const password = formData.get("password");
        const confirmPassword = formData.get("confirmPassword");

        if (password !== confirmPassword) {
            setError(t("errors.mismatch"));
            setIsLoading(false);
            return;
        }

        try {
            // 1) Create the account
            const registerResponse = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, phoneNumber, password }),
            });

            const registerData = await registerResponse.json();

            if (!registerResponse.ok) {
                setError(registerData.message || t("errors.generic"));
                setIsLoading(false);
                return;
            }

            // 2) Auto-login with the same credentials to establish a session
            const loginResponse = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!loginResponse.ok) {
                // Account was created but auto-login failed — send them to sign in manually.
                router.push("/login");
                return;
            }

            // SUCCESS!
            router.refresh();
            router.push("/dashboard");
        } catch (err) {
            console.error("Signup Error:", err);
            setError(t("errors.network"));
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-10">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="text-center mb-8">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight">
                        Kennel<span className="text-indigo-600">OS</span>
                    </span>
                    <p className="text-slate-500 mt-2 text-sm font-medium">
                        {t("subheading")}
                    </p>
                </div>

                <GoogleAuthButton />

                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                        {tAuth("divider")}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form action={handleSignup} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t("fullNameLabel")}
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                            placeholder={t("fullNamePlaceholder")}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t("emailLabel")}
                        </label>
                        <input
                            type="email"
                            name="email"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                            placeholder={t("emailPlaceholder")}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {t("phoneLabel")}{" "}
                            <span className="text-slate-400 font-normal">{t("optional")}</span>
                        </label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                            placeholder={t("phonePlaceholder")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {t("passwordLabel")}
                            </label>
                            <input
                                type="password"
                                name="password"
                                required
                                minLength={8}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {t("confirmLabel")}
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                required
                                minLength={8}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {isLoading ? t("submitting") : t("submit")}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    {t("haveAccount")}{" "}
                    <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                        {t("loginLink")}
                    </Link>
                </div>
            </div>
        </main>
    );
}
