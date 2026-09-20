"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();

    // States
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // The function now receives native FormData automatically
    const handleLogin = async (formData: FormData) => {
        setIsLoading(true);
        setError("");

        // Extract values directly from the form inputs via their 'name' attribute
        const email = formData.get("email");
        const password = formData.get("password");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            console.log("response: ", response, "\nData: ", data);

            if (!response.ok) {
                setError(data.message || "Something went wrong.");
                setIsLoading(false);
                return;
            }

            // SUCCESS!
            router.refresh();
            router.push("/dashboard");

        } catch (err) {
            console.error("Login Error:", err);
            setError("Failed to connect to the server.");
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900">Kennel Manager</h1>
                    <p className="text-gray-500 mt-2">Sign in to manage your kennel</p>
                </div>

                {/* Changed onSubmit to action */}
                <form action={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        {/* Added name="email", removed value and onChange */}
                        <input
                            type="email"
                            name="email"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                            placeholder="kennel@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        {/* Added name="password", removed value and onChange */}
                        <input
                            type="password"
                            name="password"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-blue-400"
                    >
                        {isLoading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-blue-600 hover:underline font-bold">
                        Register here
                    </Link>
                </div>
            </div>
        </main>
    );
}