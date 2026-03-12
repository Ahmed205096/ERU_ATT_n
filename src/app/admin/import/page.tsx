import { getCourses } from "@/actions/courses";
import { getImportHistory } from "@/actions/imports";
import AttendanceImport from "@/components/AttendanceImport";

export default async function ImportPage() {
    const [courses, history] = await Promise.all([
        getCourses(),
        getImportHistory(),
    ]);

    return (
        <div className="max-w-6xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-white tracking-tight">Data Management</h1>
                <p className="text-slate-400">Import attendance rosters and manage data logs</p>
            </div>
            
            <AttendanceImport courses={courses} history={history} />
        </div>
    );
}
