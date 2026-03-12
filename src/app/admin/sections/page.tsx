"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { getCourses } from "@/actions/courses";
import {
    getSections,
    createSection,
    deleteSection,
    addStudent,
    removeStudent,
    importStudentsFromExcel,
} from "@/actions/sections";
import ConfirmModal from "@/components/ConfirmModal";

interface CourseData {
    _id: string;
    name: string;
}

interface SectionData {
    _id: string;
    sectionNumber: string;
    courseId: { _id: string; name: string } | string;
    students: { studentId: string; name: string }[];
}

export default function SectionsPage() {
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [sections, setSections] = useState<SectionData[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [sectionNumber, setSectionNumber] = useState("");
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [newStudentId, setNewStudentId] = useState("");
    const [newStudentName, setNewStudentName] = useState("");
    const [importResult, setImportResult] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadSections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCourse]);

    async function loadData() {
        setLoading(true);
        const coursesData = await getCourses();
        setCourses(coursesData);
        if (coursesData.length > 0) {
            setSelectedCourse(coursesData[0]._id);
        }
        setLoading(false);
    }

    async function loadSections() {
        if (!selectedCourse) return;
        const data = await getSections(selectedCourse);
        setSections(data);
    }

    async function handleCreateSection(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCourse || !sectionNumber.trim()) return;
        startTransition(async () => {
            await createSection(selectedCourse, sectionNumber.trim());
            setSectionNumber("");
            await loadSections();
        });
    }

    function handleDeleteSection(id: string) {
        setSectionToDelete(id);
        setIsDeleteModalOpen(true);
    }

    async function confirmDeleteSection() {
        if (!sectionToDelete) return;
        startTransition(async () => {
            await deleteSection(sectionToDelete);
            setIsDeleteModalOpen(false);
            setSectionToDelete(null);
            await loadSections();
        });
    }

    async function handleAddStudent(sectionId: string) {
        if (!newStudentId.trim() || !newStudentName.trim()) return;
        startTransition(async () => {
            await addStudent(sectionId, newStudentId.trim(), newStudentName.trim());
            setNewStudentId("");
            setNewStudentName("");
            await loadSections();
        });
    }

    async function handleRemoveStudent(sectionId: string, studentId: string) {
        startTransition(async () => {
            await removeStudent(sectionId, studentId);
            await loadSections();
        });
    }

    async function handleFileUpload(sectionId: string, file: File) {
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        startTransition(async () => {
            const result = await importStudentsFromExcel(
                sectionId,
                Array.from(uint8Array)
            );
            setImportResult(`✅ Successfully imported ${result.imported} students`);
            setTimeout(() => setImportResult(null), 3000);
            await loadSections();
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

    if (courses.length === 0) {
        return (
            <div className="max-w-4xl mx-auto text-center py-20 animate-fade-in">
                <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-slate-400 text-lg">No courses created yet</p>
                <p className="text-slate-500 text-sm mt-1">Create a course first to add sections</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Sections</h1>
                <p className="text-slate-400">Manage sections and students</p>
            </div>

            {/* Import result notification */}
            {importResult && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm animate-fade-in">
                    {importResult}
                </div>
            )}

            {/* Course selector */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Course
                </label>
                <select
                    id="course-select"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                    {courses.map((c) => (
                        <option key={c._id} value={c._id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Create Section Form */}
            <form
                onSubmit={handleCreateSection}
                className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 mb-6"
            >
                <h2 className="text-lg font-semibold text-white mb-4">Add New Section</h2>
                <div className="flex gap-3">
                    <input
                        id="section-number-input"
                        type="text"
                        value={sectionNumber}
                        onChange={(e) => setSectionNumber(e.target.value)}
                        placeholder="Section number (e.g. A1, B2)"
                        className="flex-1 px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button
                        id="add-section-btn"
                        type="submit"
                        disabled={isPending || !sectionNumber.trim()}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 whitespace-nowrap"
                    >
                        {isPending ? "Adding..." : "Add Section"}
                    </button>
                </div>
            </form>

            {/* Sections List */}
            {sections.length === 0 ? (
                <div className="text-center py-12 bg-[#1e293b] border border-[#334155] rounded-2xl">
                    <p className="text-slate-400">No sections for this course yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sections.map((section) => {
                        const isExpanded = expandedSection === section._id;
                        return (
                            <div
                                key={section._id}
                                className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden transition-all duration-300"
                            >
                                {/* Section header */}
                                <div
                                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#334155]/30 transition-colors"
                                    onClick={() =>
                                        setExpandedSection(isExpanded ? null : section._id)
                                    }
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                            <span className="text-purple-400 font-bold">
                                                {section.sectionNumber}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold">
                                                Section {section.sectionNumber}
                                            </h3>
                                            <p className="text-sm text-slate-400">
                                                {section.students.length} student
                                                {section.students.length !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSection(section._id);
                                            }}
                                            className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all text-sm"
                                        >
                                            Delete
                                        </button>
                                        <svg
                                            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                                }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="border-t border-[#334155] p-5 animate-fade-in">
                                        {/* Add student form */}
                                        <div className="mb-6">
                                            <h4 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">
                                                Add Student Manually
                                            </h4>
                                            <div className="flex gap-2 flex-wrap">
                                                <input
                                                    type="text"
                                                    value={newStudentId}
                                                    onChange={(e) => setNewStudentId(e.target.value)}
                                                    placeholder="Student ID"
                                                    className="flex-1 min-w-[120px] px-3 py-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    value={newStudentName}
                                                    onChange={(e) => setNewStudentName(e.target.value)}
                                                    placeholder="Student Name"
                                                    className="flex-1 min-w-[120px] px-3 py-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                />
                                                <button
                                                    onClick={() => handleAddStudent(section._id)}
                                                    disabled={
                                                        isPending ||
                                                        !newStudentId.trim() ||
                                                        !newStudentName.trim()
                                                    }
                                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        {/* Excel upload */}
                                        <div className="mb-6">
                                            <h4 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">
                                                Import from Excel
                                            </h4>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".xlsx,.xls,.csv"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleFileUpload(section._id, file);
                                                    }}
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isPending}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg transition-all text-sm font-medium border border-green-600/30"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    Upload Excel File
                                                </button>
                                                <span className="text-xs text-slate-500">
                                                    Columns: &quot;ID&quot; and &quot;Name&quot; (or &quot;Student ID&quot; / &quot;Student Name&quot;)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Students list */}
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">
                                                Students ({section.students.length})
                                            </h4>
                                            {section.students.length === 0 ? (
                                                <p className="text-sm text-slate-500 py-2">
                                                    No students in this section yet
                                                </p>
                                            ) : (
                                                <div className="space-y-1 max-h-80 overflow-y-auto">
                                                    {section.students.map((s, idx) => (
                                                        <div
                                                            key={`${s.studentId}-${idx}`}
                                                            className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg hover:bg-[#0f172a]/80 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs text-slate-500 w-8">
                                                                    {idx + 1}.
                                                                </span>
                                                                <div>
                                                                    <p className="text-sm text-white">{s.name}</p>
                                                                    <p className="text-xs text-slate-400">
                                                                        ID: {s.studentId}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() =>
                                                                    handleRemoveStudent(section._id, s.studentId)
                                                                }
                                                                className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded transition-all"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Delete Section"
                message="Are you sure you want to delete this section? This will permanently remove all student data associated with it."
                onConfirm={confirmDeleteSection}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setSectionToDelete(null);
                }}
                isLoading={isPending}
            />
        </div>
    );
}
