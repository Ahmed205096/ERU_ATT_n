"use client";

import { useEffect, useState } from "react";
import { lookupStudent, markPresent } from "@/actions/attendance";
import { getSettings } from "@/actions/settings";
import Link from "next/link";

interface StudentResult {
  sectionId: string;
  sectionNumber: string;
  courseId: string;
  courseName: string;
  studentName: string;
  studentId: string;
}

export default function CheckInPage() {
  const [studentId, setStudentId] = useState("");
  const [results, setResults] = useState<StudentResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [marking, setMarking] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (e) {
      console.error("Error loading settings:", e);
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleLookup() {
    if (!studentId.trim()) {
      setError("Please enter your Student ID");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    setResults(null);

    try {
      const found = await lookupStudent(studentId.trim());
      if (!found || found.length === 0) {
        setError("Student ID not found. Please check and try again.");
      } else {
        const activeCourseId = settings?.activeCourseId;
        const filtered = activeCourseId
          ? found.filter((r: StudentResult) => r.courseId === activeCourseId)
          : found;

        if (filtered.length === 0) {
          setError("You are not registered for the currently active checking-in course.");
        } else {
          setResults(filtered);
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPresent(sectionId: string) {
    if (!settings?.currentWeek) return;
    setMarking(sectionId);
    setError("");
    setSuccess("");
    try {
      const result = await markPresent(sectionId, settings.currentWeek, studentId.trim());

      if (result.success) {
        setSuccess("✅ Attendance marked successfully!");
        setResults(null);
        setStudentId("");
      } else if (result.alreadyPresent) {
        setError("⚠️ " + (result.message || "You have already registered for this section this week!"));
        setResults(null);
        setStudentId("");
      } else {
        setError(result.message || "Failed to mark attendance.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setMarking(null);
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0f172a] selection:bg-indigo-500/30">
      {/* Background accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[150px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header (Always Visible) */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-xl border border-white/10 rounded-[2rem] mb-6 shadow-2xl pulse-glow">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Student Portal</h1>
          <p className="text-slate-400 font-medium">
            System status: {settings?.isCheckInActive ? <span className="text-emerald-400">Online & Ready</span> : <span className="text-amber-400">Attendance Closed</span>}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#1e293b]/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-fade-in overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {!settings?.isCheckInActive ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="text-indigo-400/50 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check-In Closed</h2>
              <p className="text-slate-400 text-sm mb-6">Student registration is currently disabled.</p>
              <button onClick={loadSettings} className="text-xs text-indigo-400 hover:underline">Refresh Status</button>
            </div>
          ) : (
            <>
              <div className="mb-6 relative">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Identity Verification (Attendance)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input
                    id="student-id-input"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    placeholder="Enter Student ID"
                    className="w-full pl-12 pr-4 py-4 bg-[#0f172a]/50 border border-white/5 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-lg font-medium"
                  />
                </div>
              </div>

              <button
                id="lookup-btn"
                onClick={handleLookup}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Verifying...
                  </span>
                ) : "Verify Identity"}
              </button>

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium flex items-center gap-3 animate-slide-in">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm font-medium flex items-center gap-3 animate-slide-in">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {success}
                </div>
              )}

              {results && (
                <div className="mt-8 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Available Sections</h3>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  {results.map((r) => (
                    <div key={r.sectionId} className="group relative p-5 bg-[#0f172a]/40 border border-white/5 rounded-2xl hover:border-indigo-500/30 transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xl font-bold text-white mb-1">{r.studentName}</p>
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <span className="px-2 py-0.5 bg-white/5 rounded-md border border-white/5">{r.courseName}</span>
                            <span>•</span>
                            <span>Section {r.sectionNumber}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        id={`confirm-btn-${r.sectionId}`}
                        onClick={() => handleMarkPresent(r.sectionId)}
                        disabled={marking === r.sectionId}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/30"
                      >
                        {marking === r.sectionId ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Marking...
                          </span>
                        ) : "✓ Confirm Attendance"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 animate-fade-in">
          <Link
            href="/projects"
            className="w-full max-w-sm py-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-medium rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-sm"
          >
            <span className="text-xl">🚀</span>
            Access Academic Projects Portal
          </Link>

          {/* <p className="text-center text-slate-600 text-xs font-medium">
            Protected by Ahmed Khattab Secure System
          </p> */}
        </div>
      </div>
    </div>
  );
}
