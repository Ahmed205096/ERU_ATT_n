"use client";

import React, { useState, useMemo } from "react";

interface CourseReportClientProps {
    report: any;
}

export default function CourseReportClient({ report }: CourseReportClientProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return report.data;
        const term = searchTerm.toLowerCase();
        return report.data.filter((student: any) => 
            student.studentName.toLowerCase().includes(term) || 
            student.studentId.toString().toLowerCase().includes(term)
        );
    }, [report.data, searchTerm]);

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative group max-w-md">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Search by student name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-[#1e293b]/50 border border-white/5 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-[#1e293b] transition-all backdrop-blur-sm shadow-xl"
                />
            </div>

            <div className="bg-[#1e293b]/50 backdrop-blur-md border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative group/table">
                {/* Scroll Indicator for mobile */}
                <div className="md:hidden absolute top-4 right-6 bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-indigo-500/20 animate-pulse z-20 pointer-events-none">
                    Scroll Right ➡️
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-[#0f172a]/80 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                                <th className="px-8 py-6 sticky left-0 bg-[#0f172a] z-20 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">Student Identification</th>
                                <th className="px-4 py-6 text-center">SEC</th>
                                {report.weeks.map((week: number) => {
                                    const warningsEndingHere = report.warningConfigs.filter(
                                        (c: any) => c.weeks && Math.max(...c.weeks) === week
                                    );
                                    
                                    return (
                                        <React.Fragment key={week}>
                                            <th className="px-4 py-6 text-center bg-white/5 border-x border-white/5">Week {week}</th>
                                            {warningsEndingHere.map((w: any) => (
                                                <th key={w.label} className="px-4 py-6 text-center text-amber-500 bg-amber-500/5">{w.label}</th>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                                {report.warningConfigs.filter((c: any) => !c.weeks || c.weeks.length === 0).map((w: any) => (
                                    <th key={w.label} className="px-6 py-6 text-center text-amber-500 bg-amber-500/5">{w.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={100} className="px-8 py-24 text-center text-slate-500 italic">
                                        <div className="flex flex-col items-center gap-4">
                                            <span className="text-4xl text-slate-700">🔍</span>
                                            <p className="font-bold tracking-tight">No students discovered matching "{searchTerm}"</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((student: any, idx: number) => (
                                    <tr key={student.studentId} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-5 sticky left-0 bg-[#1e293b]/95 backdrop-blur-md group-hover:bg-[#1e293b] z-10 transition-colors shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/20 shadow-inner">
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white font-black truncate max-w-[150px] md:max-w-none">{student.studentName}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono font-bold tracking-widest uppercase">{student.studentId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-center text-slate-400 font-black font-mono">
                                            {student.sectionNumber}
                                        </td>
                                        {report.weeks.map((week: number) => {
                                            const isPresent = student.attendance[week];
                                            const warningsEndingHere = report.warningConfigs.filter(
                                                (c: any) => c.weeks && Math.max(...c.weeks) === week
                                            );

                                            return (
                                                <React.Fragment key={week}>
                                                    <td className="px-4 py-5 text-center border-x border-white/5">
                                                        {isPresent ? (
                                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-[10px] font-black border border-emerald-500/20">P</div>
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-900 flex items-center justify-center mx-auto text-[10px] font-black border border-red-900/10 opacity-30">A</div>
                                                        )}
                                                    </td>
                                                    {warningsEndingHere.map((w: any) => (
                                                        <td key={w.label} className="px-4 py-5 text-center">
                                                            {student.warnings[w.label] ? (
                                                                <span className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-[9px] font-black shadow-lg shadow-red-600/20 animate-pulse border border-red-400">🚨 {w.label}</span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-700 font-black">—</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                        {report.warningConfigs.filter((c: any) => !c.weeks || c.weeks.length === 0).map((w: any) => (
                                            <td key={w.label} className="px-6 py-5 text-center">
                                                {student.warnings[w.label] ? (
                                                    <span className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-[9px] font-black shadow-lg shadow-red-600/20 animate-pulse border border-red-400">🚨 {w.label}</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-700 font-black">—</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>
        </div>
    );
}
