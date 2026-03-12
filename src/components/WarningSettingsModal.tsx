"use client";

import { useState } from "react";
import { updateCourseWarnings } from "@/actions/courses";

interface WarningSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    courseName: string;
    initialWarnings: any[];
    onSaved: () => void;
}

export default function WarningSettingsModal({
    isOpen,
    onClose,
    courseId,
    courseName,
    initialWarnings,
    onSaved,
}: WarningSettingsModalProps) {
    const [warnings, setWarnings] = useState(initialWarnings || []);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const addWarning = () => {
        setWarnings([
            ...warnings,
            { label: `Warning ${warnings.length + 1}`, type: "absences_count", threshold: 1, weeks: [] }
        ]);
    };

    const removeWarning = (index: number) => {
        setWarnings(warnings.filter((_, i) => i !== index));
    };

    const updateWarning = (index: number, updates: any) => {
        const newWarnings = [...warnings];
        newWarnings[index] = { ...newWarnings[index], ...updates };
        setWarnings(newWarnings);
    };

    const toggleWeek = (warningIndex: number, week: number) => {
        const warning = warnings[warningIndex];
        const newWeeks = warning.weeks.includes(week)
            ? warning.weeks.filter((w: number) => w !== week)
            : [...warning.weeks, week].sort((a, b) => a - b);
        updateWarning(warningIndex, { weeks: newWeeks });
    };

    async function handleSave() {
        setLoading(true);
        try {
            await updateCourseWarnings(courseId, warnings);
            onSaved();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to save warnings");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1e293b] border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-600/10 to-transparent">
                    <div>
                        <h2 className="text-2xl font-black text-white">{courseName}</h2>
                        <p className="text-slate-400 text-sm">Configure automatic attendance warnings</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    {warnings.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-slate-500">No warnings configured yet.</p>
                        </div>
                    ) : (
                        warnings.map((warning, idx) => (
                            <div key={idx} className="bg-[#0f172a] border border-white/5 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <input
                                        value={warning.label}
                                        onChange={(e) => updateWarning(idx, { label: e.target.value })}
                                        className="bg-transparent text-white font-bold text-lg outline-none focus:text-indigo-400 transition-colors w-1/2"
                                        placeholder="Warning Label (e.g. Warning 1)"
                                    />
                                    <button onClick={() => removeWarning(idx)} className="text-red-400/50 hover:text-red-400 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Absence Threshold</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={warning.threshold}
                                                    onChange={(e) => updateWarning(idx, { threshold: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-[#1e293b] border border-white/5 rounded-2xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-24"
                                                    min="1"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">Absences</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1 ml-1 italic">Triggers if student misses this many weeks or more</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Range of Weeks to Monitor</label>
                                            <button
                                                onClick={() => updateWarning(idx, { weeks: [] })}
                                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                            >
                                                Select All Weeks
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(w => (
                                                <button
                                                    key={w}
                                                    type="button"
                                                    onClick={() => toggleWeek(idx, w)}
                                                    className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${warning.weeks.includes(w)
                                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                                            : "bg-[#1e293b] text-slate-500 hover:text-white"
                                                        }`}
                                                >
                                                    {w}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic ml-1">
                                            {warning.weeks.length > 0
                                                ? `Only absences within Weeks [${warning.weeks.join(", ")}] will be counted.`
                                                : "All recorded weeks will be monitored for absences."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    <button
                        onClick={addWarning}
                        className="w-full py-4 border-2 border-dashed border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 rounded-3xl text-indigo-400 font-bold transition-all flex items-center justify-center gap-2 group"
                    >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add New Warning Rule
                    </button>
                </div>

                <div className="p-8 border-t border-white/5 bg-[#0f172a]/50 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-[2] px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            </div>
        </div>
    );
}
