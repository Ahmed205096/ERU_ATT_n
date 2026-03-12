"use client";

import { useEffect, useState, useTransition } from "react";
import { getCourses } from "@/actions/courses";
import { getAttendanceStats } from "@/actions/attendance";
import { getSettings, updateSettings } from "@/actions/settings";
import Link from "next/link";

export default function AdminDashboard() {
    const [courses, setCourses] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [coursesData, statsData, settingsData] = await Promise.all([
                getCourses(),
                getAttendanceStats(),
                getSettings(),
            ]);
            setCourses(coursesData);
            setStats(statsData);
            setSettings(settingsData);
        } catch (e) {
            console.error("Error loading dashboard data:", e);
        }
        setLoading(false);
    }

    async function handleToggleActive() {
        if (!settings) return;
        const newStatus = !settings.isCheckInActive;
        startTransition(async () => {
            const updated = await updateSettings({ isCheckInActive: newStatus });
            setSettings(updated);
        });
    }

    async function handleWeekChange(newWeek: number) {
        if (!settings) return;
        if (newWeek < 1) return;
        startTransition(async () => {
            const updated = await updateSettings({ currentWeek: newWeek });
            setSettings(updated);
        });
    }

    async function handleCourseChange(courseId: string) {
        if (!settings) return;
        startTransition(async () => {
            const updated = await updateSettings({ activeCourseId: courseId || null });
            setSettings(updated);
        });
    }

    if (loading || !settings) {
        return (
            <div className="flex items-center justify-center py-20">
                <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    const totalSections = courses.reduce(
        (sum: number, c: { sections: any[] }) => sum + (c.sections?.length || 0),
        0
    );

    return (
        <div className="max-w-6xl mx-auto animate-fade-in pb-12 space-y-10">
            {/* Background accent */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#334155]/50 pb-8">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-2">
                        <span className="w-8 h-[2px] bg-indigo-500 rounded-full"></span>
                        Overview
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Dashboard</h1>
                    <p className="text-slate-400 mt-1 max-w-md">Manage your attendance cycles and monitor student engagement in real-time.</p>
                </div>

                {/* Global Controls Card */}
                <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 shadow-2xl rounded-3xl p-5 flex flex-wrap items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Week</p>
                            <input
                                type="number"
                                value={settings.currentWeek}
                                onChange={(e) => handleWeekChange(parseInt(e.target.value) || 1)}
                                className="w-14 bg-transparent border-none p-0 text-white font-bold text-lg focus:ring-0 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="h-10 w-[1px] bg-[#334155]" />

                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 ${settings.isCheckInActive ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-400"} rounded-xl flex items-center justify-center transition-colors`}>
                            {settings.isCheckInActive ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</p>
                            <button
                                onClick={handleToggleActive}
                                disabled={isPending}
                                className={`text-sm font-bold flex items-center gap-2 ${settings.isCheckInActive ? "text-green-400" : "text-slate-400"}`}
                            >
                                {settings.isCheckInActive ? "ACTIVE" : "CLOSED"}
                                <div className={`w-2 h-2 rounded-full ${settings.isCheckInActive ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
                            </button>
                        </div>
                    </div>

                    <div className="h-10 w-[1px] bg-[#334155]" />

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtering</p>
                            <select
                                value={settings.activeCourseId || ""}
                                onChange={(e) => handleCourseChange(e.target.value)}
                                className="bg-transparent border-none p-0 text-white font-bold text-sm focus:ring-0 focus:outline-none max-w-[120px] truncate"
                                disabled={isPending}
                            >
                                <option className="bg-[#1e293b]" value="">No Filter</option>
                                {courses.map(course => (
                                    <option className="bg-[#1e293b]" key={course._id} value={course._id}>{course.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="group relative bg-[#1e293b]/50 backdrop-blur-sm border border-white/5 rounded-[2rem] p-8 overflow-hidden transition-all duration-300 hover:border-indigo-500/30">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-24 h-24 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </div>
                            <span className="text-sm font-medium text-slate-400">Courses</span>
                        </div>
                        <p className="text-4xl font-black text-white">{courses.length}</p>
                        <div className="mt-4 flex items-center text-xs text-indigo-400/80 font-medium">
                            Total registered courses
                        </div>
                    </div>
                </div>

                <div className="group relative bg-[#1e293b]/50 backdrop-blur-sm border border-white/5 rounded-[2rem] p-8 overflow-hidden transition-all duration-300 hover:border-purple-500/30">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-24 h-24 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <span className="text-sm font-medium text-slate-400">Sections</span>
                        </div>
                        <p className="text-4xl font-black text-white">{totalSections}</p>
                        <div className="mt-4 flex items-center text-xs text-purple-400/80 font-medium">
                            Across all disciplines
                        </div>
                    </div>
                </div>

                <div className="group relative bg-[#1e293b]/50 backdrop-blur-sm border border-white/5 rounded-[2rem] p-8 overflow-hidden transition-all duration-300 hover:border-green-500/30">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-24 h-24 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <span className="text-sm font-medium text-slate-400">Check-ins</span>
                        </div>
                        <p className="text-4xl font-black text-white">{stats?.totalCheckedIn || 0}</p>
                        <div className="mt-4 flex items-center text-xs text-green-400/80 font-medium uppercase">
                            Week {settings.currentWeek} Active
                        </div>
                    </div>
                </div>

                <div className="group relative bg-[#1e293b]/50 backdrop-blur-sm border border-white/5 rounded-[2rem] p-8 overflow-hidden transition-all duration-300 hover:border-amber-500/30">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-24 h-24 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <span className="text-sm font-medium text-slate-400">Live Sessions</span>
                        </div>
                        <p className="text-4xl font-black text-white">{stats?.sessionsActive || 0}</p>
                        <div className="mt-4 flex items-center text-xs text-amber-400/80 font-medium uppercase">
                            Open collections
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl font-bold text-white">Quick Actions</h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#334155] to-transparent" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Link href="/admin/courses" className="flex items-center gap-5 p-6 bg-[#1e293b]/40 backdrop-blur-md border border-white/5 rounded-[1.5rem] hover:bg-[#1e293b]/60 transition-all duration-300 group shadow-lg hover:shadow-indigo-500/10">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">Courses</p>
                            <p className="text-xs text-slate-500">Edit content & hierarchy</p>
                        </div>
                    </Link>
                    <Link href="/admin/sections" className="flex items-center gap-5 p-6 bg-[#1e293b]/40 backdrop-blur-md border border-white/5 rounded-[1.5rem] hover:bg-[#1e293b]/60 transition-all duration-300 group shadow-lg hover:shadow-purple-500/10">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">Sections</p>
                            <p className="text-xs text-slate-500">Sync students & rosters</p>
                        </div>
                    </Link>
                    <Link href="/admin/attendance" className="flex items-center gap-5 p-6 bg-[#1e293b]/40 backdrop-blur-md border border-white/5 rounded-[1.5rem] hover:bg-[#1e293b]/60 transition-all duration-300 group shadow-lg hover:shadow-green-500/10">
                        <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">View Data</p>
                            <p className="text-xs text-slate-500">Export logs & analysis</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
