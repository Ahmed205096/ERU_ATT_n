"use client";

import { useEffect, useState, useTransition } from "react";
import { getCourses } from "@/actions/courses";
import { getSections } from "@/actions/sections";
import { removeAttendance, autoMarkWeek } from "@/actions/attendance";
import useSWR from "swr";

interface CourseData {
    _id: string;
    name: string;
}

interface SectionData {
    _id: string;
    sectionNumber: string;
    students: { studentId: string; name: string }[];
}

interface AttendanceData {
    presentStudents: string[];
    count: number;
    students: { studentId: string; name: string }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AttendancePage() {
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [sections, setSections] = useState<SectionData[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [weekNumber, setWeekNumber] = useState(() => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor(
            (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
        );
        return Math.ceil((days + startOfYear.getDay() + 1) / 7);
    });
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);

    // SWR polling for live attendance data
    const { data: attendance, mutate } = useSWR<AttendanceData>(
        selectedSection && weekNumber
            ? `/api/attendance/${selectedSection}/${weekNumber}`
            : null,
        fetcher,
        { refreshInterval: 5000 }
    );

    useEffect(() => {
        loadCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) loadSections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCourse]);

    async function loadCourses() {
        setLoading(true);
        const data = await getCourses();
        setCourses(data);
        if (data.length > 0) setSelectedCourse(data[0]._id);
        setLoading(false);
    }

    async function loadSections() {
        const data = await getSections(selectedCourse);
        setSections(data);
        if (data.length > 0) setSelectedSection(data[0]._id);
        else setSelectedSection("");
    }

    async function handleRemove(studentId: string) {
        startTransition(async () => {
            await removeAttendance(selectedSection, weekNumber, studentId);
            mutate();
        });
    }

    async function handleAutoMarkWeek() {
        if (!selectedSection) return;
        if (!confirm(`Are you sure you want to automatically mark Week ${weekNumber} present for all students who attended at least once in this section?`)) return;
        
        startTransition(async () => {
            const result = await autoMarkWeek(selectedSection, weekNumber);
            if (result.success) {
                alert(`Successfully marked ${result.count} students for Week ${weekNumber}.`);
                mutate();
            }
        });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Live Attendance</h1>
                <p className="text-slate-400">
                    Real-time view of student check-ins (auto-refreshes every 5s)
                </p>
            </div>

            {/* Filters */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Course
                        </label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => {
                                setSelectedCourse(e.target.value);
                                setSelectedSection("");
                            }}
                            className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                        >
                            {courses.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Section
                        </label>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                            disabled={sections.length === 0}
                        >
                            {sections.length === 0 ? (
                                <option value="">No sections</option>
                            ) : (
                                sections.map((s) => (
                                    <option key={s._id} value={s._id}>
                                        Section {s.sectionNumber}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Week Number
                        </label>
                        <input
                            type="number"
                            value={weekNumber}
                            onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                            min={1}
                            max={52}
                            className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Live count card */}
            {selectedSection && (
                <div className="mb-6">
                    <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-8 text-center pulse-glow">
                        <p className="text-sm font-medium text-indigo-300 uppercase tracking-wider mb-2">
                            Students Checked In
                        </p>
                        <p className="text-6xl font-bold text-white mb-2">
                            {attendance?.count ?? 0}
                        </p>
                        <p className="text-sm text-slate-400">
                            Week {weekNumber} •{" "}
                            {sections.find((s) => s._id === selectedSection)?.sectionNumber
                                ? `Section ${sections.find((s) => s._id === selectedSection)?.sectionNumber}`
                                : ""}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-3">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-xs text-green-400">Live</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Checked-in students table */}
            {selectedSection && (
                <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-[#334155] flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">
                            Checked-In Students
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">
                                {attendance?.count ?? 0} present
                            </span>
                            <button
                                onClick={handleAutoMarkWeek}
                                disabled={isPending || !selectedSection}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Auto-fill Week {weekNumber}
                            </button>
                        </div>
                    </div>

                    {!attendance || attendance.students.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p>No students checked in yet for this week</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#334155]">
                            {attendance.students.map((s, idx) => (
                                <div
                                    key={s.studentId}
                                    className="flex items-center justify-between px-5 py-4 hover:bg-[#334155]/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-green-400 font-semibold text-sm">
                                                {idx + 1}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{s.name}</p>
                                            <p className="text-xs text-slate-400">ID: {s.studentId}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(s.studentId)}
                                        disabled={isPending}
                                        className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all text-sm font-medium disabled:opacity-50"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
