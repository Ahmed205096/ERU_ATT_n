"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    getProjectRule, getProjectIdeas, searchStudentsForTeam,
    createTeam, getTeamsForCourse, checkStudentExists, getStudentTeam,
    updateTeamMembers
} from "@/actions/projects";

export default function StudentCourseProjectsPage({ params }: { params: Promise<{ courseId: string }> }) {
    const router = useRouter();
    const { courseId } = use(params);

    // Login/Auth Simulation
    const [studentId, setStudentId] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [studentData, setStudentData] = useState<any>(null);

    // Data State
    const [rule, setRule] = useState<any>(null);
    const [ideas, setIdeas] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [existingTeam, setExistingTeam] = useState<any>(null);

    // Team Formation State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<any[]>([]); // doesn't include leader

    // Idea Selection State
    const [ideaMode, setIdeaMode] = useState<"list" | "custom">("list");
    const [selectedIdeaId, setSelectedIdeaId] = useState("");
    const [customIdeaTitle, setCustomIdeaTitle] = useState("");
    const [customIdeaDesc, setCustomIdeaDesc] = useState("");

    // Registration Metadata
    const [sectionInput, setSectionInput] = useState("");
    const [selectedDay, setSelectedDay] = useState("Saturday");
    const [selectedPeriod, setSelectedPeriod] = useState("First");


    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch each resource independently so one failure doesn't block all
                let fetchedRule = null;
                let fetchedIdeas: any[] = [];
                let fetchedTeams: any[] = [];

                try {
                    fetchedRule = await getProjectRule(courseId);
                } catch (e: any) {
                    console.error("Failed to fetch project rule:", e);
                }

                try {
                    fetchedIdeas = await getProjectIdeas(courseId);
                } catch (e: any) {
                    console.error("Failed to fetch project ideas:", e);
                }

                try {
                    fetchedTeams = await getTeamsForCourse(courseId);
                } catch (e: any) {
                    console.error("Failed to fetch teams:", e);
                }

                setRule(fetchedRule);
                setIdeas(fetchedIdeas);
                setTeams(fetchedTeams);

                // Auto-login if studentId is in localStorage for this course
                const savedId = localStorage.getItem(`studentId_${courseId}`);
                if (savedId) {
                    await performLogin(savedId);
                }
            } catch (err: any) {
                console.error("Failed to load course project data:", err);
                setError("Failed to load course project data: " + (err?.message || "Unknown error"));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [courseId]);

    const performLogin = async (id: string) => {
        setError("");
        try {
            const result = await checkStudentExists(id, courseId);
            if (!result.exists) {
                localStorage.removeItem(`studentId_${courseId}`);
                throw new Error(result.message);
            }

            const team = await getStudentTeam(courseId, id);
            if (team) setExistingTeam(team);

            setStudentData(result.student);
            setStudentId(id);
            setIsLoggedIn(true);
            localStorage.setItem(`studentId_${courseId}`, id);
        } catch (err: any) {
            setError(err.message || "Session expired or invalid ID");
        }
    };

    // Handle initial login form
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        await performLogin(studentId);
    };

    const handleLogout = () => {
        localStorage.removeItem(`studentId_${courseId}`);
        setIsLoggedIn(false);
        setStudentData(null);
        setStudentId("");
        setExistingTeam(null);
    };

    const [searchLoading, setSearchLoading] = useState(false);

    // Handle Searching for team members
    const handleSearch = async () => {
        if (searchQuery.length < 2) {
            setError("Search query must be at least 2 characters");
            return;
        }
        setSearchLoading(true);
        setError("");
        try {
            const results = await searchStudentsForTeam(courseId, searchQuery);
            const filtered = results.filter((r: any) => r.studentId !== studentData?.studentId);
            setSearchResults(filtered);
            if (filtered.length === 0) setError("No students found with this ID or Name");
        } catch (err) {
            console.error("Search failed");
            setError("Search failed. Please try again.");
        } finally {
            setSearchLoading(false);
        }
    };

    const addMember = (student: any) => {
        if (student.hasTeam) return;
        if (!rule) return;
        // Check max size (members + leader)
        if (selectedMembers.length + 1 >= rule.maxTeamSize) {
            setError(`Maximum team size is ${rule.maxTeamSize}`);
            return;
        }
        if (!selectedMembers.find(m => m.studentId === student.studentId)) {
            setSelectedMembers([...selectedMembers, student]);
            setSearchQuery("");
            setSearchResults([]);
            setError("");
        }
    };

    const removeMember = (id: string) => {
        setSelectedMembers(selectedMembers.filter(m => m.studentId !== id));
    };

    const handleCreateTeam = async () => {
        if (!rule) return;
        setSubmitting(true);
        setError("");
        try {
            let ideaOption: any = {};
            if (ideaMode === "list") {
                if (!selectedIdeaId) throw new Error("Please select an idea.");
                ideaOption = { type: "idea_id", value: selectedIdeaId };
            } else {
                if (!customIdeaTitle || !customIdeaDesc) throw new Error("Please provide custom idea details.");
                ideaOption = { type: "custom", title: customIdeaTitle, description: customIdeaDesc };
            }

            const memberIds = selectedMembers.map(m => m.studentId);
            if (!sectionInput) throw new Error("Please specify your section number.");

            await createTeam(
                courseId,
                studentData.studentId,
                memberIds,
                ideaOption,
                sectionInput,
                selectedDay,
                selectedPeriod
            );


            alert("Team created successfully!");
            router.push(`/projects/board/${courseId}`); // redirect to course board
        } catch (err: any) {
            setError(err.message || "Failed to create team.");
        } finally {
            setSubmitting(false);
        }
    };
    const handleUpdateTeam = async (newMember: any) => {
        if (!existingTeam || !rule) return;
        if (newMember.hasTeam) return;
        setSubmitting(true);
        setError("");
        try {
            const currentMembers = existingTeam.members || [];
            if (currentMembers.length >= rule.maxTeamSize) {
                throw new Error(`Team is already full (${rule.maxTeamSize} max)`);
            }
            const updatedMembers = [...currentMembers, newMember.studentId];
            await updateTeamMembers(existingTeam._id, updatedMembers);

            const updatedTeam = await getStudentTeam(courseId, studentId);
            setExistingTeam(updatedTeam);
            setSearchQuery("");
            setSearchResults([]);
        } catch (err: any) {
            setError(err.message || "Failed to update team");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveFromEstablishedTeam = async (targetId: string) => {
        if (!existingTeam) return;
        if (targetId === existingTeam.leaderId) return;

        setSubmitting(true);
        try {
            const updatedMembers = existingTeam.members.filter((id: string) => id !== targetId);
            await updateTeamMembers(existingTeam._id, updatedMembers);

            const updatedTeam = await getStudentTeam(courseId, studentId);
            setExistingTeam(updatedTeam);
        } catch (err: any) {
            setError(err.message || "Failed to remove member");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] animate-pulse"></div>

                <div className="relative z-10 flex flex-col items-center space-y-8">
                    {/* Pulsing logo/icon */}
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 animate-bounce">
                        <span className="text-4xl">🚀</span>
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
                            Verifying Session
                        </h2>
                        <div className="flex items-center gap-1 justify-center text-slate-500 font-mono text-sm">
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-ping"></span>
                            <span>Securing your portal access...</span>
                        </div>
                    </div>

                    {/* Loading bar */}
                    <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-full animate-shimmer origin-left"></div>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes shimmer {
                        0% { transform: scaleX(0); }
                        50% { transform: scaleX(0.7); }
                        100% { transform: scaleX(1); }
                    }
                    .animate-shimmer {
                        animation: shimmer 2s infinite ease-in-out;
                    }
                `}</style>
            </div>
        );
    }

    // LOGIN SCREEN
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-6 text-center">
                        Student Project Portal
                    </h1>
                    <p className="text-slate-400 mb-6 text-center">Enter your Student ID to access the project portal for this course.</p>

                    {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-lg text-sm mb-4 border border-red-500/50">{error}</div>}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Student ID"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                        />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-medium transition-colors">
                            Enter Portal
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // MAIN STUDENT PORTAL
    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 text-white">
            <header className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Project Team Formation
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-slate-400">Welcome, <span className="text-blue-300 font-medium">{studentData?.name}</span> ({studentData?.studentId})</p>
                        <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-0.5 rounded bg-red-500/5 transition-all">
                            Logout
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isLoggedIn && !existingTeam && (
                        <button 
                            onClick={handleCreateTeam}
                            disabled={submitting || !rule || (ideaMode === "list" && !selectedIdeaId) || (ideaMode === 'custom' && (!customIdeaTitle || !customIdeaDesc))}
                            className="hidden md:block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black px-6 py-2 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs uppercase tracking-widest animate-in fade-in zoom-in-95 duration-500"
                        >
                            {submitting ? "Registering..." : "Confirm & Submit Team"}
                        </button>
                    )}
                    <button onClick={() => router.push(`/projects/board/${courseId}`)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm transition-colors border border-slate-700">
                        Board
                    </button>
                </div>
            </header>

            {error && <div className="bg-red-500/20 text-red-200 p-4 rounded-lg border border-red-500/50 flex align-center justify-between">
                {error}
                <button onClick={() => setError("")} className="text-red-400 hover:text-red-300">×</button>
            </div>}

            {existingTeam ? (
                /* EXISTING TEAM VIEW */
                <div className="max-w-4xl mx-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in relative">
                        {/* Decorative top border */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>

                        <div className="p-10 space-y-8">
                            <div className="flex flex-wrap items-start justify-between gap-6">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Active Project</span>
                                    </div>
                                    <h2 className="text-4xl font-black text-white leading-tight">
                                        {existingTeam.ideaId?.title || existingTeam.customIdea?.title}
                                    </h2>
                                    <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
                                        {existingTeam.ideaId?.description || existingTeam.customIdea?.description}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl backdrop-blur-sm flex-1 text-center min-w-[120px]">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Section</p>
                                        <p className="text-white font-black text-lg">
                                            {existingTeam.sectionNumber}
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl backdrop-blur-sm flex-1 text-center min-w-[120px]">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Schedule</p>
                                        <p className="text-white font-bold text-sm">
                                            {existingTeam.day}
                                        </p>
                                        <p className="text-orange-400 font-bold text-[10px] uppercase">
                                            {existingTeam.period} Period
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl backdrop-blur-sm flex-1 text-center min-w-[120px]">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-center">Formed On</p>
                                        <p className="text-white font-mono text-sm leading-8">
                                            {new Date(existingTeam.createdAt).toLocaleDateString('en-GB')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-800/50">
                                <div className="flex items-center gap-4 mb-6">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Team Roster ({existingTeam.members?.length || 0}/5)</h3>
                                    <div className="h-px flex-1 bg-slate-800/50"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {existingTeam.membersWithNames?.map((member: any) => (
                                        <div key={member.studentId} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${member.studentId === existingTeam.leaderId ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-800/30 border-slate-700/50'} group`}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl shadow-inner">
                                                    {member.studentId === existingTeam.leaderId ? '👑' : '👤'}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{member.name}</p>
                                                    <p className="text-slate-500 text-xs font-medium">{member.studentId} {member.studentId === existingTeam.leaderId && '• Leader'}</p>
                                                </div>
                                            </div>

                                            {studentData.studentId === existingTeam.leaderId && member.studentId !== existingTeam.leaderId && (
                                                <button
                                                    onClick={() => handleRemoveFromEstablishedTeam(member.studentId)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add Member Slot for Leader */}
                                    {studentData.studentId === existingTeam.leaderId && (existingTeam.members?.length || 0) < (rule?.maxTeamSize || 5) && (
                                        <div className="md:col-span-2 mt-4 space-y-4">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Add more members by Student ID or Name..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors shadow-inner"
                                                />
                                                <button
                                                    onClick={handleSearch}
                                                    disabled={searchLoading}
                                                    className="bg-blue-600 hover:bg-blue-500 px-6 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                                >
                                                    {searchLoading ? "..." : "Search"}
                                                </button>
                                            </div>

                                            {searchResults.length > 0 && (
                                                <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto overflow-x-hidden">
                                                    {searchResults.map(s => (
                                                        <button
                                                            key={s.studentId}
                                                            type="button"
                                                            onClick={() => handleUpdateTeam(s)}
                                                            disabled={s.hasTeam}
                                                            className="w-full text-left p-3 hover:bg-slate-700 flex justify-between items-center transition-colors border-b border-slate-700/50 last:border-0 disabled:opacity-50"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium text-white">{s.name}</p>
                                                                <p className="text-xs text-slate-400">{s.studentId}</p>
                                                            </div>
                                                            {s.hasTeam ? (
                                                                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">In Team</span>
                                                            ) : (
                                                                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Add to Team</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-800/50">
                                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>Team registered successfully</span>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => router.push(`/projects/board/${courseId}`)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all">
                                        Course Teams Board
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* ... existing build team UI ... */}

                    {/* Rules & Team Selection Sidebar (Left 4 cols) */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Rules Block */}
                        <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl shadow-xl">
                            <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                                <span className="text-xl">📋</span> Course Project Rules
                            </h2>
                            {rule ? (
                                <ul className="space-y-3 text-sm text-slate-300">
                                    <li className="flex justify-between border-b border-slate-700/50 pb-2">
                                        <span>Maximum Team Size:</span>
                                        <span className="font-bold text-white bg-slate-700 px-2 py-0.5 rounded">{rule.maxTeamSize} Members</span>
                                    </li>
                                    <li className="flex justify-between border-b border-slate-700/50 pb-2">
                                        <span>Duplicate Ideas Allowed:</span>
                                        <span className={`font-bold px-2 py-0.5 rounded ${rule.allowDuplicateIdeas ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {rule.allowDuplicateIdeas ? "Yes" : "No"}
                                        </span>
                                    </li>
                                </ul>
                            ) : (
                                <p className="text-yellow-500 text-sm">Rules have not been configured by the admin yet.</p>
                            )}
                        </div>

                        {/* Team Members Builder */}
                        <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-4">
                            <h2 className="text-lg font-semibold text-blue-400">Build Your Team</h2>

                            <div className="space-y-2">
                                {/* Leader (Current user) */}
                                <div className="flex items-center justify-between bg-blue-600/20 border border-blue-500/30 p-3 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-blue-300">{studentData?.name}</p>
                                        <p className="text-xs text-blue-400/70">{studentData?.studentId}</p>
                                    </div>
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-900/50 px-2 py-1 rounded">Leader</span>
                                </div>

                                {/* Added Members */}
                                {selectedMembers.map(m => (
                                    <div key={m.studentId} className="flex items-center justify-between bg-slate-900 border border-slate-700 p-3 rounded-lg group">
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">{m.name}</p>
                                            <p className="text-xs text-slate-400">{m.studentId}</p>
                                        </div>
                                        <button
                                            onClick={() => removeMember(m.studentId)}
                                            className="text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 px-2 py-1 rounded transition-all text-xs"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}

                                {/* Add Member Search Input */}
                                {(selectedMembers.length + 1) < (rule?.maxTeamSize || 99) && (
                                    <div className="relative mt-4">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Search student by Name or ID..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                                            />
                                            <button
                                                onClick={handleSearch}
                                                disabled={searchLoading}
                                                className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                            >
                                                {searchLoading ? (
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                ) : "Search"}
                                            </button>
                                        </div>
                                        {searchResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                                                {searchResults.map(s => (
                                                    <button
                                                        key={s.studentId}
                                                        type="button"
                                                        onClick={() => addMember(s)}
                                                        disabled={s.hasTeam}
                                                        className="w-full text-left p-3 hover:bg-slate-700 flex justify-between items-center transition-colors border-b border-slate-700/50 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-white">{s.name}</p>
                                                            <p className="text-xs text-slate-400">{s.studentId}</p>
                                                        </div>
                                                        {s.hasTeam ? (
                                                            <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">In Team</span>
                                                        ) : (
                                                            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Add</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between text-xs text-slate-500 px-1 pt-2">
                                    <span>Members: {selectedMembers.length + 1} / {rule?.maxTeamSize || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section & Time Info */}
                        <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-4">
                            <h2 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                                <span>📅</span> Lab Schedule Info
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Section Number</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="e.g. 12"
                                        value={sectionInput}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setSectionInput(val);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-700"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Day</label>
                                        <select
                                            value={selectedDay}
                                            onChange={(e) => setSelectedDay(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="Saturday">Saturday</option>
                                            <option value="Sunday">Sunday</option>
                                            <option value="Monday">Monday</option>
                                            <option value="Tuesday">Tuesday</option>
                                            <option value="Wednesday">Wednesday</option>
                                            <option value="Thursday">Thursday</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Period</label>
                                        <select
                                            value={selectedPeriod}
                                            onChange={(e) => setSelectedPeriod(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="First">First</option>
                                            <option value="Second">Second</option>
                                            <option value="Third">Third</option>
                                            <option value="Fourth">Fourth</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Ideas Selection (Right 7 cols) */}
                    <div className="lg:col-span-7 bg-slate-800/40 border border-slate-700 p-6 rounded-2xl shadow-xl flex flex-col">
                        <h2 className="text-lg font-semibold text-purple-400 mb-4 flex justify-between items-center">
                            Select Project Idea
                            <div className="flex bg-slate-900 rounded-lg p-1 text-sm border border-slate-700">
                                <button
                                    onClick={() => setIdeaMode("list")}
                                    className={`px-4 py-1.5 rounded-md transition-all ${ideaMode === "list" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                                >
                                    Provided Ideas
                                </button>
                                <button
                                    onClick={() => setIdeaMode("custom")}
                                    className={`px-4 py-1.5 rounded-md transition-all ${ideaMode === "custom" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                                >
                                    Custom Idea
                                </button>
                            </div>
                        </h2>

                        <button
                            onClick={handleCreateTeam}
                            disabled={submitting || !rule || (ideaMode === "list" && !selectedIdeaId) || (ideaMode === 'custom' && (!customIdeaTitle || !customIdeaDesc))}
                            className="w-full mb-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm uppercase tracking-widest"
                        >
                            {submitting ? "Processing..." : "Confirm & Create Team"}
                        </button>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {ideaMode === "list" ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {ideas.length === 0 ? (
                                        <p className="text-slate-500 italic p-4 text-center">No ideas provided for this course yet.</p>
                                    ) : (
                                        ideas.map(idea => {
                                            // Check if idea is taken (if duplicates not allowed)
                                            const isTaken = !rule?.allowDuplicateIdeas && teams.some(t => t.ideaId?._id === idea._id);
                                            const isSelected = selectedIdeaId === idea._id;

                                            return (
                                                <div
                                                    key={idea._id}
                                                    onClick={() => !isTaken && setSelectedIdeaId(idea._id)}
                                                    className={`p-5 rounded-xl border transition-all cursor-pointer relative group ${isTaken ? "opacity-50 cursor-not-allowed bg-slate-900 border-slate-800"
                                                        : isSelected ? "bg-purple-900/20 border-purple-500 shadow-lg shadow-purple-500/10"
                                                            : "bg-slate-900 border-slate-700 hover:border-purple-400/50"
                                                        }`}
                                                >
                                                    {isTaken && (
                                                        <div className="absolute top-4 right-4 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">Taken</div>
                                                    )}
                                                    {isSelected && (
                                                        <div className="absolute top-4 right-4 text-xl">✨</div>
                                                    )}
                                                    <h3 className={`font-semibold mb-2 pr-16 ${isSelected ? "text-purple-300" : "text-slate-200"}`}>{idea.title}</h3>
                                                    <p className="text-sm text-slate-400 leading-relaxed">{idea.description}</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 bg-slate-900 flex-1 p-6 rounded-xl border border-slate-700">
                                    <p className="text-sm text-slate-400 mb-4">Propose your own idea for the project. Make sure the description is detailed enough for the instructor.</p>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Project Title</label>
                                        <input
                                            type="text"
                                            value={customIdeaTitle}
                                            onChange={(e) => setCustomIdeaTitle(e.target.value)}
                                            placeholder="e.g. AI-Powered Smart Library"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm text-slate-300 mb-1">Detailed Description</label>
                                        <textarea
                                            value={customIdeaDesc}
                                            onChange={(e) => setCustomIdeaDesc(e.target.value)}
                                            placeholder="Explain the core functionality, tech stack, and goals..."
                                            rows={8}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition-colors resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-700">
                            <button
                                onClick={handleCreateTeam}
                                disabled={submitting || !rule || (ideaMode === "list" && !selectedIdeaId) || (ideaMode === 'custom' && (!customIdeaTitle || !customIdeaDesc))}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                            >
                                {submitting ? "Forming Team & Registering Project..." : "Confirm & Create Team Dashboard"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </div>
    );
}