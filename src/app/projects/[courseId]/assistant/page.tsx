"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { 
    getProjectIdeas, addProjectIdea, deleteProjectIdea,
    getDetailedTeamsForCourse, searchStudentsForTeam, updateTeamMembers, deleteTeam, updateTeamLeader 
} from "@/actions/projects";

export default function AssistantPortalPage({ params }: { params: Promise<{ courseId: string }> }) {
    const router = useRouter();
    const { courseId } = use(params);

    // Ideas State
    const [ideas, setIdeas] = useState<any[]>([]);
    const [newIdeaTitle, setNewIdeaTitle] = useState("");
    const [newIdeaDescription, setNewIdeaDescription] = useState("");

    // Status
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [auth, setAuth] = useState<any>(null);

    // Teams Management State
    const [teams, setTeams] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [managingTeamId, setManagingTeamId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"ideas" | "teams">("teams");
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const checkAuth = () => {
            const stored = sessionStorage.getItem(`assistant_auth_${courseId}`);
            if (!stored) {
                router.push(`/projects/${courseId}/assistant/login`);
                return null;
            }
            return JSON.parse(stored);
        };

        const fetchData = async () => {
            const session = checkAuth();
            if (!session) return;
            setAuth(session);
            
            try {
                const fetchedIdeas = await getProjectIdeas(courseId);
                setIdeas(fetchedIdeas);

                const fetchedTeams = await getDetailedTeamsForCourse(courseId);
                setTeams(fetchedTeams);
            } catch (err: any) {
                setError(err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [courseId, router]);

    const refreshTeams = async () => {
        const fetchedTeams = await getDetailedTeamsForCourse(courseId);
        setTeams(fetchedTeams);
    };

    const handleAddIdea = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIdeaTitle || !newIdeaDescription) return;
        setSaving(true);
        try {
            await addProjectIdea(courseId, newIdeaTitle, newIdeaDescription, "admin_manual", "assistant_" + auth.studentName);
            const fetchedIdeas = await getProjectIdeas(courseId);
            setIdeas(fetchedIdeas);
            setNewIdeaTitle("");
            setNewIdeaDescription("");
            showToast("Project idea registered!", "success");
        } catch (err: any) {
            setError(err.message || "Failed to add idea");
            showToast("Failed to register idea", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteIdea = async (ideaId: string) => {
        try {
            await deleteProjectIdea(ideaId, courseId);
            const fetchedIdeas = await getProjectIdeas(courseId);
            setIdeas(fetchedIdeas);
            showToast("Project idea removed", "info");
        } catch (err: any) {
            setError(err.message || "Failed to delete idea");
            showToast("Deletion failed", "error");
        }
    };

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;
        setSearchLoading(true);
        try {
            const results = await searchStudentsForTeam(courseId, searchQuery);
            setSearchResults(results);
        } catch (e) {
            console.error(e);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAdminDeleteTeam = async (id: string) => {
        try {
            await deleteTeam(id, courseId);
            await refreshTeams();
            showToast("Team terminated successfully", "info");
        } catch (err: any) {
            setError(err.message);
            showToast("Team deletion failed", "error");
        }
    };

    const handleAdminUpdateMembers = async (teamId: string, memberIds: string[], newLeaderId?: string) => {
        try {
            await updateTeamMembers(teamId, memberIds, true); // Assistants use Admin Priority bypass
            if (newLeaderId) {
                await updateTeamLeader(teamId, newLeaderId);
            }
            await refreshTeams();
            setSearchQuery("");
            setSearchResults([]);
            setManagingTeamId(null);
            showToast("Team roster updated", "success");
        } catch (err: any) {
            setError(err.message);
            showToast("Update failed", "error");
        }
    };

    if (loading) return (
        <div className="bg-slate-950 min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-xl text-slate-500 font-medium">Authenticating credentials...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center text-3xl border border-orange-500/20 shadow-lg shadow-orange-500/5">
                            🎓
                        </div>
                        <div>
                            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600">
                                Assistant Portal
                            </h1>
                            <p className="text-slate-500 mt-1 font-medium italic">Welcome, {auth.studentName} (Appointed by TA {auth.appointedByTA})</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                            <button 
                                onClick={() => setActiveTab("teams")}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "teams" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                Teams
                            </button>
                            <button 
                                onClick={() => setActiveTab("ideas")}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "ideas" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                Ideas
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => {
                                sessionStorage.removeItem(`assistant_auth_${courseId}`);
                                router.push(`/projects/${courseId}/assistant/login`);
                            }}
                            className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest"
                            title="Terminate Session"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Custom Toast System */}
                {toast && (
                    <div className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl border shadow-2xl animate-in slide-in-from-right-8 duration-300 flex items-center gap-4 ${
                        toast.type === "success" ? "bg-emerald-950 border-emerald-500/30 text-emerald-400" :
                        toast.type === "error" ? "bg-red-950 border-red-500/30 text-red-400" :
                        "bg-orange-950 border-orange-500/30 text-orange-400"
                    }`}>
                        <div className="text-xl">
                            {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
                        </div>
                        <div>
                            <p className="font-black text-sm uppercase tracking-tight">{toast.type} Notification</p>
                            <p className="text-sm font-medium opacity-90">{toast.message}</p>
                        </div>
                    </div>
                )}

                {activeTab === "ideas" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500 opacity-50"></div>
                            <div className="mb-8">
                                <h2 className="text-2xl md:text-3xl font-black text-white">Project Idea Moderation</h2>
                                <p className="text-slate-500 font-medium text-sm md:text-base">Register or remove project ideas for your course.</p>
                            </div>

                            {/* Add Manual Form */}
                            <form onSubmit={handleAddIdea} className="bg-slate-950/50 p-6 rounded-[1.5rem] border border-slate-800/80 mb-10 space-y-4">
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span> New Idea Entry
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-4">
                                        <input 
                                            type="text" 
                                            placeholder="Idea Title"
                                            value={newIdeaTitle}
                                            onChange={(e) => setNewIdeaTitle(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="md:col-span-6">
                                        <input 
                                            type="text" 
                                            placeholder="Detailed description or requirements..."
                                            value={newIdeaDescription}
                                            onChange={(e) => setNewIdeaDescription(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <button 
                                            type="submit"
                                            disabled={saving || !newIdeaTitle}
                                            className="w-full h-full bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all active:scale-[0.95] disabled:opacity-50 py-4 md:py-0"
                                        >
                                            Register
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* Ideas Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ideas.map((idea) => (
                                    <div key={idea._id} className="bg-slate-950/40 border border-slate-800/80 rounded-3xl p-6 hover:border-orange-500/30 transition-all group flex flex-col shadow-inner">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${idea.source.includes('assistant') ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                {idea.source.split('_')[0]}
                                            </span>
                                            <button 
                                                onClick={() => handleDeleteIdea(idea._id)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                        <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">{idea.title}</h4>
                                        <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1">{idea.description}</p>
                                        <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between mt-auto">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered By</span>
                                            <span className="text-[10px] text-slate-400 font-bold italic">{idea.source.split('_')[1] || "Admin"}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "teams" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500 opacity-50"></div>
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-12">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white">Delegated Team Oversight</h2>
                                    <p className="text-slate-500 font-medium text-sm md:text-base">Manage student rosters and team compositions.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-8">
                                {teams.map(team => (
                                    <div key={team._id} className="bg-slate-950/50 border border-slate-800/80 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 hover:border-orange-500/20 transition-all group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 h-full w-2 bg-slate-800 group-hover:bg-orange-600 transition-colors"></div>
                                        
                                        <div className="flex flex-col lg:flex-row gap-10">
                                            <div className="flex-1 space-y-8">
                                                <div className="flex flex-wrap justify-between items-start gap-4">
                                                    <div className="space-y-1">
                                                        <h3 className="text-2xl font-black text-white group-hover:text-orange-400 transition-colors leading-tight">
                                                            {team.ideaId?.title || team.customIdea?.title}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                            <div className="flex items-center gap-2 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800/50">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Leader</span>
                                                                <span className="font-mono text-sm text-orange-400 font-bold">{team.leaderId}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800/50">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</span>
                                                                <span className="text-sm text-orange-400 font-black">{team.sectionNumber || "N/A"}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800/50">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Schedule</span>
                                                                <span className="text-xs text-orange-300 font-bold whitespace-nowrap">
                                                                    {team.day ? `${team.day} • ${team.period}` : "No Schedule"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleAdminDeleteTeam(team._id)}
                                                            className="w-full md:w-auto px-5 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border border-red-500/20 transition-all shadow-lg active:scale-95"
                                                        >
                                                            Terminate Team
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                                                    {team.membersWithNames.map((m: any) => (
                                                        <div key={m.studentId} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${m.studentId === team.leaderId ? 'bg-orange-500/5 border-orange-500/20' : 'bg-slate-900 border-slate-800'} relative group/member`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner ${m.studentId === team.leaderId ? 'bg-orange-500/20' : 'bg-slate-800'}`}>
                                                                    {m.studentId === team.leaderId ? '👑' : '👤'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-100">{m.name}</p>
                                                                    <p className="text-[10px] text-slate-500 font-mono font-bold tracking-tight uppercase">{m.studentId}</p>
                                                                </div>
                                                            </div>
                                                            
                                                        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover/member:opacity-100 transition-opacity">
                                                                {m.studentId !== team.leaderId && (
                                                                    <button 
                                                                        onClick={() => handleAdminUpdateMembers(team._id, team.members, m.studentId)}
                                                                        className="p-2 text-orange-400 hover:bg-orange-400/10 rounded-lg transition-all"
                                                                        title="Promote to Leader"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={() => {
                                                                        const filtered = team.members.filter((id: string) => id !== m.studentId);
                                                                        if (m.studentId === team.leaderId && filtered.length > 0) {
                                                                            handleAdminUpdateMembers(team._id, filtered, filtered[0]);
                                                                        } else {
                                                                            handleAdminUpdateMembers(team._id, filtered);
                                                                        }
                                                                    }}
                                                                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                                    title="Remove from Team"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {/* Add Member Functionality */}
                                                    {managingTeamId === team._id ? (
                                                        <div className="sm:col-span-2 xl:col-span-3 bg-slate-900 border border-orange-500/20 p-4 rounded-2xl animate-in zoom-in-95 duration-200 shadow-2xl">
                                                            <div className="flex flex-wrap gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Search Student..."
                                                                    value={searchQuery}
                                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                                                    className="flex-1 min-w-[120px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-500"
                                                                />
                                                                <div className="flex gap-2 w-full sm:w-auto">
                                                                    <button onClick={handleSearch} className="flex-1 bg-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Search</button>
                                                                    <button onClick={() => setManagingTeamId(null)} className="text-slate-500 px-3 py-2 bg-slate-800 rounded-xl hover:text-white transition-colors">✕</button>
                                                                </div>
                                                            </div>
                                                            {searchResults.length > 0 && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 mt-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                                    {searchResults.map(s => (
                                                                        <div 
                                                                            key={s.studentId}
                                                                            className={`flex justify-between items-center p-3 rounded-xl border transition-all ${s.hasTeam ? 'bg-slate-950/20 border-slate-800/50 opacity-40 grayscale' : 'bg-slate-950 border-slate-800 hover:border-orange-500/40 hover:bg-slate-900 group/s'}`}
                                                                        >
                                                                            <div className="flex-1 min-w-0 pr-4">
                                                                                <p className="text-xs font-black text-white truncate">{s.name}</p>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-tight">{s.studentId}</span>
                                                                                    <span className="text-[9px] text-slate-600 bg-slate-800 px-1 rounded">S{s.sectionNumber}</span>
                                                                                </div>
                                                                            </div>
                                                                            {!s.hasTeam && (
                                                                                <button 
                                                                                    onClick={() => handleAdminUpdateMembers(team._id, [...team.members, s.studentId])}
                                                                                    className="bg-orange-600/10 text-orange-400 hover:bg-orange-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                                                >
                                                                                    Enlist
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setManagingTeamId(team._id);
                                                                setSearchResults([]);
                                                                setSearchQuery("");
                                                            }}
                                                            className="flex items-center justify-center h-full p-4 rounded-2xl border-2 border-dashed border-slate-800 text-slate-600 hover:text-orange-500 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group/add"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xl group-hover/add:rotate-90 transition-transform">+</span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Enlist Member (Priority)</span>
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }
            `}</style>
        </div>
    );
}
