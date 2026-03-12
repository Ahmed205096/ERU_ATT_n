"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { 
    getProjectRule, saveProjectRule, 
    getProjectIdeas, addProjectIdea, deleteProjectIdea,
    getDetailedTeamsForCourse, searchStudentsForTeam, updateTeamMembers, deleteTeam, updateTeamLeader,
    addStudentAdmin, getStudentAdmins, deleteStudentAdmin
} from "@/actions/projects";
import { parsePdfIdeas } from "@/actions/pdf-parser";

export default function AdminCourseProjectsPage({ params }: { params: Promise<{ courseId: string }> }) {
    const router = useRouter();
    const { courseId } = use(params);

    // Rules State
    const [maxTeamSize, setMaxTeamSize] = useState(4);
    const [allowDuplicateIdeas, setAllowDuplicateIdeas] = useState(false);
    
    // Ideas State
    const [ideas, setIdeas] = useState<any[]>([]);
    const [newIdeaTitle, setNewIdeaTitle] = useState("");
    const [newIdeaDescription, setNewIdeaDescription] = useState("");
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    // Status
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    // Teams Management State
    const [teams, setTeams] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [managingTeamId, setManagingTeamId] = useState<string | null>(null);
    const [sectionQuery, setSectionQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"rules" | "ideas" | "teams" | "assistants">("rules");
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    // Student Admins State
    const [studentAdmins, setStudentAdmins] = useState<any[]>([]);
    const [newAdminStudentId, setNewAdminStudentId] = useState("");
    const [newAdminName, setNewAdminName] = useState("");
    const [newAdminUsername, setNewAdminUsername] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [appointedByTA, setAppointedByTA] = useState("");

    const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const rule = await getProjectRule(courseId);
                if (rule) {
                    setMaxTeamSize(rule.maxTeamSize);
                    setAllowDuplicateIdeas(rule.allowDuplicateIdeas);
                }
                const fetchedIdeas = await getProjectIdeas(courseId);
                setIdeas(fetchedIdeas);

                const fetchedTeams = await getDetailedTeamsForCourse(courseId);
                setTeams(fetchedTeams);

                const fetchedAdmins = await getStudentAdmins(courseId);
                setStudentAdmins(fetchedAdmins);
            } catch (err: any) {
                setError(err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [courseId]);

    const refreshTeams = async () => {
        const fetchedTeams = await getDetailedTeamsForCourse(courseId);
        setTeams(fetchedTeams);
    };

    const handleSaveRules = async () => {
        setSaving(true);
        setError("");
        try {
            await saveProjectRule(courseId, maxTeamSize, allowDuplicateIdeas);
            showToast("Governance rules updated successfully!", "success");
        } catch (err: any) {
            setError(err.message || "Failed to save rules");
            showToast("Failed to update rules", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleAddIdea = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIdeaTitle || !newIdeaDescription) return;
        setSaving(true);
        try {
            await addProjectIdea(courseId, newIdeaTitle, newIdeaDescription, "admin_manual", "admin_system");
            const fetchedIdeas = await getProjectIdeas(courseId);
            setIdeas(fetchedIdeas);
            setNewIdeaTitle("");
            setNewIdeaDescription("");
            showToast("New idea registered!", "success");
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

    const handlePdfUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pdfFile) return;
        setUploading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("file", pdfFile);
            const res = await parsePdfIdeas(formData, courseId, "admin_system");
            showToast(`Smart Import Complete: ${res.count} ideas added`, "success");
            const fetchedIdeas = await getProjectIdeas(courseId);
            setIdeas(fetchedIdeas);
            setPdfFile(null);
        } catch (err: any) {
            setError(err.message || "Failed to parse PDF. Ensure it has selectable text.");
            showToast("Import failed", "error");
        } finally {
            setUploading(false);
        }
    };

    const parseSections = (query: string): number[] => {
        const sections: number[] = [];
        const parts = query.split(/[,،]/).map(p => p.trim());
        
        parts.forEach(part => {
            if (part.includes(':')) {
                const [start, end] = part.split(':').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                        sections.push(i);
                    }
                }
            } else {
                const num = Number(part);
                if (!isNaN(num)) sections.push(num);
            }
        });
        
        return Array.from(new Set(sections));
    };

    const filteredTeams = teams.filter(team => {
        // 1. Text Search Filter (ID, Name, Project)
        const matchesSearch = !searchQuery || 
            team.leaderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.membersWithNames?.some((m: any) => 
                m.studentId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                m.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) ||
            (team.ideaId?.title || team.customIdea?.title || "").toLowerCase().includes(searchQuery.toLowerCase());

        // 2. Section Filter
        let matchesSection = true;
        if (sectionQuery.trim()) {
            const targetSections = parseSections(sectionQuery);
            if (targetSections.length > 0) {
                const teamSec = Number(team.sectionNumber);
                matchesSection = targetSections.includes(teamSec);
            }
        }

        return matchesSearch && matchesSection;
    });

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
            await updateTeamMembers(teamId, memberIds, true); // true = isAdmin bypass check
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

    const handleAddStudentAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await addStudentAdmin(courseId, newAdminStudentId, newAdminName, newAdminUsername, newAdminPassword, appointedByTA);
            const fetchedAdmins = await getStudentAdmins(courseId);
            setStudentAdmins(fetchedAdmins);
            setNewAdminStudentId("");
            setNewAdminName("");
            setNewAdminUsername("");
            setNewAdminPassword("");
            setAppointedByTA("");
            showToast("Student Admin appointed!", "success");
        } catch (err: any) {
            setError(err.message);
            showToast("Appointment failed", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStudentAdmin = async (adminId: string) => {
        try {
            await deleteStudentAdmin(adminId, courseId);
            const fetchedAdmins = await getStudentAdmins(courseId);
            setStudentAdmins(fetchedAdmins);
            showToast("Access revoked", "info");
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) return <div className="p-8 text-white flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-xl text-slate-500 font-medium">Loading project management...</div>
    </div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 text-white pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
                <div>
                    <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
                        Project Command Center
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Control rules, project ideas, and student team rosters.</p>
                </div>
                
                <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
                    <button 
                        onClick={() => setActiveTab("rules")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "rules" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        <span>⚙️</span> Rules
                    </button>
                    <button 
                        onClick={() => setActiveTab("ideas")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "ideas" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        <span>💡</span> Ideas
                    </button>
                    <button 
                        onClick={() => setActiveTab("teams")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "teams" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        <span>👥</span> Teams
                    </button>
                    <button 
                        onClick={() => setActiveTab("assistants")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "assistants" ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        <span>🎓</span> Assistants
                    </button>
                </div>
            </header>
            
            {error && <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl border border-red-500/20 animate-shake flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span className="font-medium text-sm">{error}</span>
                <button onClick={() => setError("")} className="ml-auto text-red-400/50 hover:text-red-400">×</button>
            </div>}

            {/* Custom Toast System */}
            {toast && (
                <div className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl border shadow-2xl animate-in slide-in-from-right-8 duration-300 flex items-center gap-4 ${
                    toast.type === "success" ? "bg-emerald-950 border-emerald-500/30 text-emerald-400" :
                    toast.type === "error" ? "bg-red-950 border-red-500/30 text-red-400" :
                    "bg-blue-950 border-blue-500/30 text-blue-400"
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

            {activeTab === "rules" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Rules Section */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50"></div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">⚙️</div>
                            <h2 className="text-2xl font-bold text-white">Project Governance</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Maximum Team Capacity</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        min="1" max="20"
                                        value={maxTeamSize} 
                                        onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-bold uppercase">Students</span>
                                </div>
                            </div>
                            
                            <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50 hover:border-emerald-500/30 transition-colors group/item">
                                <label className="flex items-center gap-4 cursor-pointer select-none">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={allowDuplicateIdeas}
                                            onChange={(e) => setAllowDuplicateIdeas(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-12 h-6 bg-slate-800 rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-200">Idea Duplication</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Allow multiple teams to register the same project idea.</p>
                                    </div>
                                </label>
                            </div>
                            
                            <button 
                                onClick={handleSaveRules}
                                disabled={saving}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-50"
                            >
                                {saving ? "Applying Rules..." : "Update Governance Rules"}
                            </button>
                        </div>
                    </div>

                    {/* PDF Upload Section */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-50"></div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">📄</div>
                            <h2 className="text-2xl font-bold text-white">Smart Import</h2>
                        </div>
                        
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                            Upload a project brief or PDF list to automatically extract and register ideas for the students to choose from.
                        </p>
                        
                        <form onSubmit={handlePdfUpload} className="space-y-6">
                            <div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center hover:border-blue-500/50 transition-colors group/upload cursor-pointer relative">
                                <input 
                                    type="file" 
                                    accept=".pdf"
                                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {pdfFile ? (
                                    <div className="space-y-2">
                                        <p className="text-blue-400 font-bold">{pdfFile.name}</p>
                                        <p className="text-xs text-slate-500">Ready for extraction</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-4xl">📎</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-300">Click to upload PDF</p>
                                            <p className="text-xs text-slate-500 mt-1">Maximum file size: 10MB</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button 
                                type="submit"
                                disabled={uploading || !pdfFile}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/10 active:scale-[0.98]"
                            >
                                {uploading ? "Analyzing Document..." : "Execute Smart Import"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === "ideas" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 opacity-50"></div>
                        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-8 mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-white">Idea Repository</h2>
                                <p className="text-slate-500 font-medium">Curate and manage the list of available student projects.</p>
                            </div>
                            
                            <div className="flex items-center gap-4 bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                                <div className="px-4 py-2 text-center border-r border-slate-800">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Total</p>
                                    <p className="text-xl font-mono font-bold text-white">{ideas.length}</p>
                                </div>
                                <div className="px-4 py-2 text-center">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Selected</p>
                                    <p className="text-xl font-mono font-bold text-purple-400">{teams.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Add Manual Form */}
                        <form onSubmit={handleAddIdea} className="bg-slate-950/50 p-6 rounded-[1.5rem] border border-slate-800/80 mb-10 space-y-4">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-purple-500 rounded-full"></span> New Idea Proposal
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-4">
                                    <input 
                                        type="text" 
                                        placeholder="Idea Title"
                                        value={newIdeaTitle}
                                        onChange={(e) => setNewIdeaTitle(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition-all placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="md:col-span-6">
                                    <input 
                                        type="text" 
                                        placeholder="Detailed description or requirements..."
                                        value={newIdeaDescription}
                                        onChange={(e) => setNewIdeaDescription(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition-all placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button 
                                        type="submit"
                                        disabled={saving || !newIdeaTitle}
                                        className="w-full h-full bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all active:scale-[0.95] disabled:opacity-50"
                                    >
                                        Register
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Ideas Grid */}
                        {ideas.length === 0 ? (
                            <div className="text-center py-20 bg-slate-950/20 rounded-3xl border border-slate-800 border-dashed">
                                <div className="text-6xl mb-4">🕯️</div>
                                <h3 className="text-xl font-bold text-slate-400">Empty Repository</h3>
                                <p className="text-slate-600 mt-2">Start adding ideas or use the PDF import tool.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ideas.map((idea) => (
                                    <div key={idea._id} className="bg-slate-950/40 border border-slate-800/80 rounded-3xl p-6 hover:border-purple-500/30 transition-all group flex flex-col shadow-inner">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${idea.source.includes('admin') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                {idea.source.split('_')[1]}
                                            </span>
                                            <button 
                                                onClick={() => handleDeleteIdea(idea._id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                        <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">{idea.title}</h4>
                                        <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1">{idea.description}</p>
                                        
                                        {(() => {
                                            const selectedBy = teams.filter(t => t.ideaId?._id === idea._id);
                                            return selectedBy.length > 0 ? (
                                                <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between mt-auto">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selection Count</span>
                                                    <div className="flex items-center gap-1.5 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                                        <span className="text-purple-400 font-mono text-xs font-black">{selectedBy.length}</span>
                                                        <span className="text-[10px] text-purple-400/80 font-bold uppercase">Teams</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between mt-auto">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">Availabile</span>
                                                    <span className="text-[10px] text-slate-700 font-bold">Unclaimed</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "teams" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-50"></div>
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-12">
                            <div>
                                <h2 className="text-3xl font-black text-white">Active Formations</h2>
                                <p className="text-slate-500 font-medium">Monitor team compositions and resolve membership conflicts.</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                <div className="relative group/search flex-1 md:w-80">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                                    <input 
                                        type="text" 
                                        placeholder="Filter by Student ID or Project..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:border-blue-500 outline-none w-full group-focus-within/search:ring-4 group-focus-within/search:ring-blue-500/10 transition-all font-medium"
                                    />
                                </div>
                                <div className="relative group/section flex-1 md:w-64">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">📍</span>
                                    <input 
                                        type="text" 
                                        placeholder="Sections: 1:5 or 1,4,9"
                                        value={sectionQuery}
                                        onChange={(e) => setSectionQuery(e.target.value)}
                                        className="bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:border-orange-500 outline-none w-full group-focus-within/section:ring-4 group-focus-within/section:ring-orange-500/10 transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {filteredTeams.length === 0 ? (
                            <div className="text-center py-20 bg-slate-950/20 rounded-3xl border border-slate-800 border-dashed">
                                <div className="text-6xl mb-4">{ (searchQuery || sectionQuery) ? "🔍" : "🏜️"}</div>
                                <h3 className="text-xl font-bold text-slate-400">
                                    { (searchQuery || sectionQuery) ? "No matching formations" : "No Formed Teams"}
                                </h3>
                                <p className="text-slate-600 mt-2">
                                    { (searchQuery || sectionQuery) ? "Adjust your search or section filters." : "Teams will appear here as soon as students finalize registration."}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-8">
                                {filteredTeams.map(team => (
                                    <div key={team._id} className="bg-slate-950/50 border border-slate-800/80 rounded-[2.5rem] p-8 hover:border-blue-500/20 transition-all group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 h-full w-2 bg-slate-800 group-hover:bg-blue-600 transition-colors"></div>
                                        
                                        <div className="flex flex-col lg:flex-row gap-10">
                                            <div className="flex-1 space-y-8">
                                                <div className="flex flex-wrap justify-between items-start gap-4">
                                                    <div className="space-y-1">
                                                        <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors leading-tight">
                                                            {team.ideaId?.title || team.customIdea?.title || "No Project Title"}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Leader</span>
                                                                <span className="font-mono text-sm text-orange-400 font-bold">{team.leaderId || "N/A"}</span>
                                                            </div>
                                                            <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</span>
                                                                <span className="text-sm text-orange-400 font-black">{team.sectionNumber || "N/A"}</span>
                                                            </div>
                                                            <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Schedule</span>
                                                                <span className="text-xs text-indigo-400 font-bold">
                                                                    {team.day ? `${team.day} • ${team.period}` : "No Schedule Set"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleAdminDeleteTeam(team._id)}
                                                            className="px-5 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest border border-red-500/20 transition-all shadow-lg active:scale-95"
                                                        >
                                                            Terminate Team
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                                    {team.membersWithNames.map((m: any) => (
                                                        <div key={m.studentId} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${m.studentId === team.leaderId ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-900 border-slate-800'} relative group/member`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner ${m.studentId === team.leaderId ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                                                                    {m.studentId === team.leaderId ? '👑' : '👤'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-100">{m.name}</p>
                                                                    <p className="text-[10px] text-slate-500 font-mono font-bold tracking-tight uppercase">{m.studentId}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity">
                                                                {m.studentId !== team.leaderId && (
                                                                    <button 
                                                                        onClick={() => handleAdminUpdateMembers(team._id, team.members, m.studentId)}
                                                                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
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
                                                        <div className="sm:col-span-2 xl:col-span-3 bg-slate-900 border border-blue-500/20 p-4 rounded-2xl animate-in zoom-in-95 duration-200 shadow-2xl">
                                                            <div className="flex gap-3">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Search Student..."
                                                                    value={searchQuery}
                                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500"
                                                                />
                                                                <button onClick={handleSearch} className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase">Search</button>
                                                                <button onClick={() => setManagingTeamId(null)} className="text-slate-500 px-2 py-2 hover:text-white">✕</button>
                                                            </div>
                                                            {searchResults.length > 0 && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 mt-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                                    {searchResults.map(s => (
                                                                        <div 
                                                                            key={s.studentId}
                                                                            className={`flex justify-between items-center p-3 rounded-xl border transition-all ${s.hasTeam ? 'bg-slate-950/20 border-slate-800/50 opacity-40 grayscale' : 'bg-slate-950 border-slate-800 hover:border-blue-500/40 hover:bg-slate-900 group/s'}`}
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
                                                                                    className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                                                >
                                                                                    Assigned
                                                                                </button>
                                                                            )}
                                                                            {s.hasTeam && (
                                                                                <span className="text-[9px] font-black text-red-500/50 uppercase tracking-widest">In Team</span>
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
                                                            className="flex items-center justify-center h-full p-4 rounded-2xl border-2 border-dashed border-slate-800 text-slate-600 hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group/add"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xl group-hover/add:rotate-90 transition-transform">+</span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Enlist Member (Admin Priority)</span>
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === "assistants" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500 opacity-50"></div>
                        <div className="mb-10">
                            <h2 className="text-3xl font-black text-white">Assistant Delegation</h2>
                            <p className="text-slate-500 font-medium">Appoint students to manage projects with elevated privileges.</p>
                        </div>

                        {/* Appointment Form */}
                        <form onSubmit={handleAddStudentAdmin} className="bg-slate-950/50 p-8 rounded-[1.5rem] border border-slate-800/80 mb-10 space-y-6">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span> New Appointment
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <input 
                                    type="text" placeholder="Student ID"
                                    value={newAdminStudentId} onChange={(e) => setNewAdminStudentId(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all"
                                    required
                                />
                                <input 
                                    type="text" placeholder="Student Name"
                                    value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all"
                                    required
                                />
                                <input 
                                    type="text" placeholder="Username (for separate login)"
                                    value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all"
                                    required
                                />
                                <input 
                                    type="text" placeholder="Password"
                                    value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all"
                                    required
                                />
                                <input 
                                    type="text" placeholder="Appointed By (TA Name)"
                                    value={appointedByTA} onChange={(e) => setAppointedByTA(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all"
                                    required
                                />
                                <button 
                                    type="submit" disabled={saving}
                                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all active:scale-[0.95] disabled:opacity-50 h-full py-4 lg:py-0"
                                >
                                    Appoint Assistant
                                </button>
                            </div>
                        </form>

                        {/* Assistants List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {studentAdmins.map(admin => (
                                <div key={admin._id} className="bg-slate-950/40 border border-slate-800/80 rounded-3xl p-6 hover:border-orange-500/30 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-2xl">🎓</div>
                                        <button 
                                            onClick={() => handleDeleteStudentAdmin(admin._id)}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">{admin.studentName}</h3>
                                    <p className="text-xs font-mono text-slate-500 mb-4">{admin.studentId}</p>
                                    
                                    <div className="space-y-3 pt-4 border-t border-slate-800/50">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-bold uppercase tracking-tight">Login ID</span>
                                            <span className="text-orange-400 font-mono font-bold">{admin.username}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-bold uppercase tracking-tight">Appointed By</span>
                                            <span className="text-slate-300 font-bold italic">{admin.appointedByTA}</span>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => {
                                            const url = `${window.location.origin}/projects/${courseId}/assistant/login?u=${admin.username}&p=${admin.password}`;
                                            navigator.clipboard.writeText(url);
                                            showToast("Direct access link copied!", "success");
                                        }}
                                        className="w-full mt-6 py-3 bg-orange-600/10 text-orange-500 hover:bg-orange-600 hover:text-white rounded-xl border border-orange-500/20 transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <span>🔗</span> Copy Direct Link
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.4s ease-in-out; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>
        </div>
    );
}
