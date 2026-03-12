"use client";

import { useState, useEffect, use } from "react";
import { getTeamsForCourse } from "@/actions/projects";

export default function TeamsBoardPage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = use(params);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const res = await getTeamsForCourse(courseId);
                setTeams(res);
            } catch(e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, [courseId]);

    // Filter teams based on search query (searching through member IDs or Leader ID)
    const filteredTeams = teams.filter(team => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        
        // Search in leader ID
        if (team.leaderId?.toLowerCase().includes(query)) return true;
        
        // Search in members array
        if (team.members?.some((m: string) => m.toLowerCase().includes(query))) return true;
        
        // Search in idea title
        const ideaTitle = team.ideaId?.title || team.customIdea?.title || "";
        if (ideaTitle.toLowerCase().includes(query)) return true;
        
        // Search in course name
        if (team.courseId?.name?.toLowerCase().includes(query)) return true;

        return false;
    });

    if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-white flex justify-center items-center">Loading Board...</div>;

    return (
        <div className="min-h-screen bg-slate-950 p-8 text-white">
            <div className="max-w-7xl mx-auto space-y-8">
                
                <header className="flex flex-col md:flex-row justify-between items-center gap-6 pb-6 border-b border-slate-800">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                            Course Teams Board
                        </h1>
                        <p className="text-slate-400 mt-2">Browse all formed project teams for this course.</p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                        <input 
                            type="text" 
                            placeholder="Search by Student ID or Project Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-full py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                        />
                    </div>
                </header>

                {filteredTeams.length === 0 ? (
                    <div className="text-center p-16 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">
                        <div className="text-4xl mb-4">📭</div>
                        <h3 className="text-xl font-medium text-slate-300 mb-2">No Teams Found</h3>
                        <p className="text-slate-500">{(searchQuery ? "Try verifying the student ID or adjusting your search query." : "Teams will appear here once students start forming them.")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTeams.map((team) => {
                            const isCustom = !!team.customIdea;
                            const title = team.ideaId?.title || team.customIdea?.title || "Unknown Project";
                            const description = team.ideaId?.description || team.customIdea?.description || "";
                            
                            return (
                                <div key={team._id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 transition-colors group relative overflow-hidden">
                                    {/* Top decoration line */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="mb-4 flex flex-wrap justify-between items-start gap-2">
                                        <div className="flex gap-2">
                                            <div className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-medium border border-slate-700">
                                                {team.courseId?.name || "Unknown Course"}
                                            </div>
                                            <div className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-black border border-orange-500/20">
                                                Section {team.sectionNumber || "N/A"}
                                            </div>
                                        </div>
                                        {isCustom ? (
                                            <div className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded text-xs font-bold border border-purple-500/20">
                                                Custom Idea
                                            </div>
                                        ) : (
                                            <div className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded text-[10px] font-black uppercase border border-indigo-500/20">
                                                {team.day || "Pending"} • {team.period || "TBD"}
                                            </div>
                                        )}
                                    </div>

                                    <h2 className="text-xl font-bold text-white mb-2 leading-snug">{title}</h2>
                                    <p className="text-sm text-slate-400 line-clamp-2 mb-6">{description}</p>

                                    <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Team Roster ({team.members.length})</h3>
                                        
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs">👑</div>
                                            <span className="text-sm text-slate-300 font-medium">ID: {team.leaderId}</span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {team.members.filter((m: string) => m !== team.leaderId).map((memberId: string) => (
                                                <div key={memberId} className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-400 border border-slate-700">
                                                    ID: {memberId}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
