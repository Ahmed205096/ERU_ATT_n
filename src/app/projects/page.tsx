"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Since we don't have a direct "getAllCoursesWithProjects" yet in actions, we can just list courses
// For this simple demo, we will navigate with a course ID input, or if there's an API, fetch them.
// Let's create a minimal input to go to a specific course project page.
import { getCourses } from "@/actions/courses";

export default function StudentProjectsLanding() {
    const router = useRouter();
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                // Assuming getCourses returns available courses
                const res = await getCourses();
                setCourses(res);
            } catch(e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    if (loading) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-950 p-8 text-white">
            <div className="max-w-4xl mx-auto space-y-8">
                
                <header className="text-center space-y-4 py-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
                        Academic Projects Hub
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Join your peers, form teams, and select your end-of-semester project ideas. 
                        Start by selecting your course below.
                    </p>
                </header>

                <div className="flex gap-4 justify-center mb-12">
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {courses.map(course => (
                        <div 
                            key={course._id}
                            onClick={() => router.push(`/projects/${course._id}`)}
                            className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:transform hover:-translate-y-1 shadow-xl group"
                        >
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                                <span className="text-2xl">📚</span>
                            </div>
                            <h2 className="text-xl font-semibold text-slate-200 mb-2 group-hover:text-blue-400 transition-colors">
                                {course.name}
                            </h2>
                            <p className="text-sm text-slate-500">
                                Click to enter the project portal for this course. Form your team and secure your idea.
                            </p>
                            <div className="mt-4 flex items-center text-sm font-medium text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                Enter Portal ➡️
                            </div>
                        </div>
                    ))}
                </div>

                {courses.length === 0 && (
                    <div className="text-center p-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                        <p className="text-slate-400">No courses available at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
