import React from "react";
import { getCourseReport } from "@/actions/courses";
import Link from "next/link";
import CourseReportClient from "@/components/CourseReportClient";

export default async function CourseReportPage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;
    const report = await getCourseReport(courseId);

    return (
        <div className="max-w-[95vw] mx-auto py-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">{report.courseName}</h1>
                    <p className="text-slate-400">Attendance Preview & Analysis</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <Link
                        href="/admin/courses"
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </Link>
                    <a
                        href={`/api/export/${courseId}`}
                        download
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl shadow-lg shadow-green-600/20 transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export Excel
                    </a>
                </div>
            </div>

            {report.data.length === 0 ? (
                <div className="mt-8 text-center py-20 bg-[#1e293b]/50 rounded-[2.5rem] border border-white/5">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Attendance Data Found</h3>
                    <p className="text-slate-500">Students need to check in before a report can be generated.</p>
                </div>
            ) : (
                <CourseReportClient report={report} />
            )}
        </div>
    );
}
