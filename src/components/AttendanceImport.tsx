"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { importAttendanceAction, undoImportAction } from "@/actions/imports";
import { useRouter } from "next/navigation";

interface AttendanceImportProps {
    courses: any[];
    history: any[];
}

export default function AttendanceImport({ courses, history }: AttendanceImportProps) {
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const sections = courses.find(c => c._id === selectedCourse)?.sections || [];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    const parseExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // We want to detect ID column and Sec 1, Sec 2, etc.
            const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            
            // Look for header row
            let headerRowIndex = -1;
            let idColIndex = -1;
            const weekCols: { week: number, index: number }[] = [];

            const idAliases = ["id", "student id", "studentid", "code", "رقم الطالب", "الكود", "كود الطالب", "الرقم الجامعي", "الرقم"];

            for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
                const row = jsonData[i];
                if (!Array.isArray(row)) continue;

                for (let j = 0; j < row.length; j++) {
                    const cell = String(row[j] || "").trim().toLowerCase();
                    if (idColIndex === -1 && idAliases.includes(cell)) {
                        idColIndex = j;
                        headerRowIndex = i;
                    }
                    if (cell.includes("sec") || cell.includes("week") || cell.includes("أسبوع") || cell.includes("سيكشن")) {
                        const match = cell.match(/\d+/);
                        if (match) {
                            weekCols.push({ week: parseInt(match[0]), index: j });
                            headerRowIndex = i;
                        }
                    }
                }
                if (idColIndex !== -1 && weekCols.length > 0) break;
            }

            if (idColIndex === -1) {
                setError("Could not find Student ID column in Excel.");
                return;
            }

            const parsedRecords: any[] = [];
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!Array.isArray(row)) continue;

                const studentId = String(row[idColIndex] || "").trim();
                if (!studentId || !/^\d+$/.test(studentId)) continue;

                const presentWeeks: number[] = [];
                for (const weekCol of weekCols) {
                    const val = String(row[weekCol.index] || "").trim();
                    if (val === "1" || val.toLowerCase() === "p" || val.toLowerCase() === "حاضر") {
                        presentWeeks.push(weekCol.week);
                    }
                }

                if (presentWeeks.length > 0) {
                    parsedRecords.push({ studentId, weeks: presentWeeks });
                }
            }

            setPreview(parsedRecords);
            setError("");
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImport = async () => {
        if (!selectedSection) {
            setError("Please select a section first.");
            return;
        }
        if (preview.length === 0) {
            setError("No valid records found to import.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await importAttendanceAction({
                sectionId: selectedSection,
                filename: file?.name || "imported_excel.xlsx",
                records: preview
            });
            setSuccess(`Successfully imported attendance for ${preview.length} students.`);
            setPreview([]);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            router.refresh();
        } catch (e: any) {
            setError(e.message || "Failed to import attendance.");
        } finally {
            setLoading(false);
        }
    };

    const handleUndo = async (id: string) => {
        if (!confirm("Are you sure you want to undo this import? This will remove all attendance entries added in this batch.")) return;
        
        setLoading(true);
        try {
            await undoImportAction(id);
            setSuccess("Import undone successfully.");
            router.refresh();
        } catch (e: any) {
            setError(e.message || "Failed to undo import.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="bg-[#1e293b]/50 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </div>
                    Excel Attendance Import
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Course</label>
                        <select 
                            value={selectedCourse} 
                            onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSection(""); }}
                            className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">Choose Course...</option>
                            {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Section</label>
                        <select 
                            value={selectedSection} 
                            onChange={(e) => setSelectedSection(e.target.value)}
                            disabled={!selectedCourse}
                            className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                        >
                            <option value="">Choose Section...</option>
                            {sections.map((s: any) => <option key={s._id} value={s._id}>Section {s.sectionNumber}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2 mb-8">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Excel File</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-indigo-500/50 hover:bg-white/5 transition-all group"
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".xlsx, .xls, .csv" 
                        />
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        </div>
                        <p className="text-white font-bold">{file ? file.name : "Click to select or drag & drop Excel file"}</p>
                        <p className="text-slate-500 text-sm mt-2">Supports .xlsx, .xls, .csv with ID and Week/Sec columns</p>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm mb-6">{error}</div>}
                {success && <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-sm mb-6">{success}</div>}

                {preview.length > 0 && (
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Preview Data ({preview.length} records)</h3>
                            <button 
                                onClick={handleImport}
                                disabled={loading || !selectedSection}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                                {loading ? "Importing..." : "Confirm Import"}
                            </button>
                        </div>
                        <div className="max-h-64 overflow-auto rounded-2xl border border-white/5 bg-[#0f172a]/50">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#1e293b] text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-3">Student ID</th>
                                        <th className="px-6 py-3">Weeks Present</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-white/5">
                                    {preview.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-3 text-white font-medium">{row.studentId}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {row.weeks.map((w: number) => (
                                                        <span key={w} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-md text-[10px] font-bold">Week {w}</span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* History Section */}
            <div className="bg-[#1e293b]/50 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6">Recent Imports</h3>
                {history.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        No import history found.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((item: any) => (
                            <div key={item._id} className="flex items-center justify-between p-6 bg-[#0f172a]/50 border border-white/5 rounded-2xl group">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">{item.filename}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(item.timestamp).toLocaleString()} • {item.logs.length} records
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleUndo(item._id)}
                                    disabled={loading}
                                    className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-bold opacity-0 group-hover:opacity-100 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" /></svg>
                                    Undo
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
