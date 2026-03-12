"use client";

import { useEffect, useState, useTransition } from "react";
import { getCourses, createCourse, deleteCourse } from "@/actions/courses";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import WarningSettingsModal from "@/components/WarningSettingsModal";

interface CourseData {
    _id: string;
    name: string;
    sections: { _id: string; sectionNumber: string }[];
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [name, setName] = useState("");
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [selectedCourseForWarning, setSelectedCourseForWarning] = useState<CourseData | null>(null);

    useEffect(() => {
        loadCourses();
    }, []);

    async function loadCourses() {
        setLoading(true);
        const data = await getCourses();
        setCourses(data);
        setLoading(false);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        startTransition(async () => {
            await createCourse(name.trim());
            setName("");
            await loadCourses();
        });
    }

    function handleDelete(id: string) {
        setCourseToDelete(id);
        setIsDeleteModalOpen(true);
    }

    async function confirmDeleteCourse() {
        if (!courseToDelete) return;
        startTransition(async () => {
            await deleteCourse(courseToDelete);
            setIsDeleteModalOpen(false);
            setCourseToDelete(null);
            await loadCourses();
        });
    }
    function handleOpenWarnings(course: CourseData) {
        setSelectedCourseForWarning(course);
        setIsWarningModalOpen(true);
    }
    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Courses</h1>
                <p className="text-slate-400">Create and manage your courses</p>
            </div>

            {/* Add Course Form */}
            <form
                onSubmit={handleCreate}
                className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 mb-6"
            >
                <h2 className="text-lg font-semibold text-white mb-4">Add New Course</h2>
                <div className="flex gap-3">
                    <input
                        id="course-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Course name (e.g. Software Engineering)"
                        className="flex-1 px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button
                        id="add-course-btn"
                        type="submit"
                        disabled={isPending || !name.trim()}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 whitespace-nowrap"
                    >
                        {isPending ? "Adding..." : "Add Course"}
                    </button>
                </div>
            </form>

            {/* Course List */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">
                    <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-indigo-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading courses...
                </div>
            ) : courses.length === 0 ? (
                <div className="text-center py-12 bg-[#1e293b] border border-[#334155] rounded-2xl">
                    <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-slate-400 text-lg">No courses yet</p>
                    <p className="text-slate-500 text-sm mt-1">Create your first course above</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {courses.map((course, i) => (
                        <div
                            key={course._id}
                            className="bg-[#1e293b] border border-[#334155] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-500/30 transition-all duration-300 animate-slide-in shadow-xl group"
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                    <span className="text-indigo-400 font-black text-xl">
                                        {course.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-white font-black text-xl truncate">{course.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800/50 px-2 py-0.5 rounded-lg border border-white/5">
                                            {course.sections?.length || 0} Sections
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 pt-4 md:pt-0 border-t border-white/5 md:border-none">
                                <button
                                    onClick={() => handleOpenWarnings(course)}
                                    className="flex-1 md:flex-none px-4 py-2.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl transition-all duration-200 text-xs font-black uppercase tracking-tight flex items-center justify-center gap-2 border border-amber-500/20"
                                >
                                    ⚠️ Warnings
                                </button>
                                <Link
                                    href={`/admin/courses/${course._id}/projects`}
                                    className="flex-1 md:flex-none px-4 py-2.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white rounded-xl transition-all duration-200 text-xs font-black uppercase tracking-tight flex items-center justify-center gap-2 border border-purple-500/20"
                                >
                                    🚀 Projects
                                </Link>
                                <Link
                                    href={`/admin/courses/${course._id}/report`}
                                    className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl transition-all duration-200 text-xs font-black uppercase tracking-tight flex items-center justify-center gap-2 border border-indigo-500/20"
                                >
                                    📊 Preview
                                </Link>
                                <a
                                    href={`/api/export/${course._id}`}
                                    download
                                    className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all duration-200 text-xs font-black uppercase tracking-tight flex items-center justify-center gap-2 border border-emerald-500/20"
                                >
                                    📥 Export
                                </a>
                                <button
                                    onClick={() => handleDelete(course._id)}
                                    disabled={isPending}
                                    className="w-full md:w-auto px-4 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-200 text-xs font-black uppercase tracking-tight border border-red-500/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Delete Course"
                message="Are you sure you want to delete this course? This will permanently remove all sections and attendance data associated with it."
                onConfirm={confirmDeleteCourse}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setCourseToDelete(null);
                }}
                isLoading={isPending}
            />

            {selectedCourseForWarning && (
                <WarningSettingsModal
                    isOpen={isWarningModalOpen}
                    onClose={() => {
                        setIsWarningModalOpen(false);
                        setSelectedCourseForWarning(null);
                    }}
                    courseId={selectedCourseForWarning._id}
                    courseName={selectedCourseForWarning.name}
                    initialWarnings={(selectedCourseForWarning as any).warningConfigs}
                    onSaved={loadCourses}
                />
            )}
        </div>
    );
}
