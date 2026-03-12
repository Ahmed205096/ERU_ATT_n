import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Course from "@/models/Course";
import Section from "@/models/Section";
import Attendance from "@/models/Attendance";
import * as XLSX from "xlsx";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        await dbConnect();
        const { courseId } = await params;
        console.log("Exporting course:", courseId);

        const course = await Course.findById(courseId).lean();
        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const sections = await Section.find({ courseId }).lean();
        const sectionIds = sections.map((s) => s._id);

        const allAttendance = await Attendance.find({
            sectionId: { $in: sectionIds },
        }).lean();

        // Find all week numbers
        const weeksSet = new Set<number>();
        allAttendance.forEach((a) => weeksSet.add(a.weekNumber));
        const sortedWeeks = Array.from(weeksSet).sort((a, b) => a - b);

        // Prepare data
        const exportData: any[] = [];

        sections.forEach((section) => {
            section.students.forEach((student: any) => {
                const row: any = {
                    "Student Name": student.name,
                    "Student ID": student.studentId,
                    "Section": section.sectionNumber,
                };

                let absencesCount = 0;
                const studentWeeksPresent = new Set<number>();

                // Helper to calculate a specific warning
                const calculateWarning = (config: any) => {
                    let absencesInConfig = 0;
                    const targetWeeks = (config.weeks && config.weeks.length > 0)
                        ? config.weeks
                        : sortedWeeks;

                    targetWeeks.forEach((w: number) => {
                        if (!studentWeeksPresent.has(w)) {
                            absencesInConfig++;
                        }
                    });
                    return absencesInConfig >= (config.threshold || 0) ? "Warning" : "";
                };

                // Add weeks and interleave warnings
                sortedWeeks.forEach((week) => {
                    const weekRecord = allAttendance.find(
                        (a) => String(a.sectionId) === String(section._id) && a.weekNumber === week
                    );
                    const isPresent = weekRecord?.presentStudents?.includes(student.studentId);

                    if (isPresent) {
                        studentWeeksPresent.add(week);
                        row[`Week ${week}`] = "P";
                    } else {
                        row[`Week ${week}`] = "-";
                    }

                    // Insert warnings that END at this week
                    if (course.warningConfigs) {
                        course.warningConfigs.forEach((config: any) => {
                            if (config.weeks && config.weeks.length > 0) {
                                const maxWeek = Math.max(...config.weeks);
                                if (maxWeek === week) {
                                    row[config.label] = calculateWarning(config);
                                }
                            }
                        });
                    }
                });

                // Add total/global warnings at the end
                if (course.warningConfigs) {
                    course.warningConfigs.forEach((config: any) => {
                        if (!config.weeks || config.weeks.length === 0) {
                            row[config.label] = calculateWarning(config);
                        }
                    });
                }

                exportData.push(row);
            });
        });

        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        const safeFilename = encodeURIComponent(`${course.name}-Attendance.xlsx`).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="${course.name.replace(/"/g, "")}-Attendance.xlsx"; filename*=UTF-8''${safeFilename}`,
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });
    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json({ error: "Export failed", detail: String(error) }, { status: 500 });
    }
}
