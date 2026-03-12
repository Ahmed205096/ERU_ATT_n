"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { studentAdminLogin } from "@/actions/projects";

export default function AssistantLoginPage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = use(params);
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e?: React.FormEvent, customU?: string, customP?: string) => {
        if (e) e.preventDefault();
        const finalU = customU || username;
        const finalP = customP || password;
        
        if (!finalU || !finalP) return;

        setLoading(true);
        setError("");
        try {
            const res = await studentAdminLogin(finalU, finalP, courseId);
            if (res.success) {
                sessionStorage.setItem(`assistant_auth_${courseId}`, JSON.stringify(res));
                router.push(`/projects/${courseId}/assistant`);
            }
        } catch (err: any) {
            setError(err.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const u = searchParams.get("u");
        const p = searchParams.get("p");
        if (u && p) {
            setUsername(u);
            setPassword(p);
            handleLogin(undefined, u, p);
        }
    }, [courseId]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1e293b,transparent)] opacity-20"></div>
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md relative animate-in fade-in zoom-in duration-500">
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                    <div className="text-center space-y-2">
                        <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-orange-500/20 shadow-lg shadow-orange-500/5">
                            🎓
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Assistant Portal</h1>
                        <p className="text-slate-500 text-sm font-medium italic">Project Delegation Access</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Identification</label>
                                <input 
                                    type="text" 
                                    placeholder="Username"
                                    value={username} onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-slate-700 font-medium"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Secret Key</label>
                                <input 
                                    type="password" 
                                    placeholder="••••••••"
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-slate-700 font-medium"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20 text-xs font-bold flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? "Authorizing..." : "Initiate Access"}
                        </button>
                    </form>
                    
                    <div className="text-center">
                        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                            Authorized Personnel Only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
