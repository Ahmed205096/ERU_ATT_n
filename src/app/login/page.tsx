"use client";

import { useState } from "react";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const formData = new FormData(e.currentTarget);
        const result = await loginAction(formData);
        if (result?.error) {
            setError(result.error);
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-white">
            <div className="w-full max-w-md bg-[#1e293b] border border-[#334155] p-8 rounded-2xl shadow-xl animate-fade-in">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500/20 rounded-xl mb-3 text-indigo-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold">Admin Login</h1>
                    <p className="text-slate-400 text-sm mt-1">Enter password to access dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            autoFocus
                            className="w-full px-4 py-2 bg-[#0f172a] border border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg transition disabled:opacity-50"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    {error && <p className="text-red-400 text-sm text-center pt-2 animate-fade-in">{error}</p>}
                </form>
            </div>
        </div>
    );
}
