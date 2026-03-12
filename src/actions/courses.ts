"use server";

import dbConnect from "@/lib/mongodb";
import Course from "@/models/Course";
import Section from "@/models/Section";
import Attendance from "@/models/Attendance";
import { revalidatePath } from "next/cache";

export async function createCourse(name: string) {
    await dbConnect();
    const course = await Course.create({ name });
    revalidatePath("/admin/courses");
    return JSON.parse(JSON.stringify(course));
}

export async function getCourses() {
    await dbConnect();
    const courses = await Course.find().populate("sections").lean();
    return JSON.parse(JSON.stringify(courses));
}

export async function deleteCourse(id: string) {
    await dbConnect();
    const course = await Course.findById(id);
    if (course) {
        // Delete all related sections and attendance records
        for (const sectionId of course.sections) {
            await Attendance.deleteMany({ sectionId });
        }
        await Section.deleteMany({ courseId: id });
        await Course.findByIdAndDelete(id);
    }
    revalidatePath("/admin/courses");
}

export async function updateCourseWarnings(courseId: string, warnings: any[]) {
    await dbConnect();
    await Course.findByIdAndUpdate(courseId, { warningConfigs: warnings });
    revalidatePath("/admin/courses");
    return { success: true };
}

export async function getCourseReport(courseId: string) {
    await dbConnect();
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error("Course not found");

    const sections = await Section.find({ courseId }).lean();
    const sectionIds = sections.map((s) => s._id);

    const allAttendance = await Attendance.find({
        sectionId: { $in: sectionIds },
    }).lean();

    const weeksSet = new Set<number>();
    allAttendance.forEach((a) => weeksSet.add(a.weekNumber));
    const sortedWeeks = Array.from(weeksSet).sort((a, b) => a - b);

    const reportData: any[] = [];

    sections.forEach((section: any) => {
        section.students.forEach((student: any) => {
            const studentWeeksPresent = new Set<number>();
            const attendanceMap: Record<number, boolean> = {};

            sortedWeeks.forEach((week) => {
                const weekRecord = allAttendance.find(
                    (a) => String(a.sectionId) === String(section._id) && a.weekNumber === week
                );
                const isPresent = weekRecord?.presentStudents?.includes(student.studentId);
                attendanceMap[week] = !!isPresent;
                if (isPresent) studentWeeksPresent.add(week);
            });

            // Calculate Warnings
            const warnings: Record<string, string> = {};
            if ((course as any).warningConfigs) {
                (course as any).warningConfigs.forEach((config: any) => {
                    let absencesInConfig = 0;
                    const targetWeeks = (config.weeks && config.weeks.length > 0) 
                        ? config.weeks 
                        : sortedWeeks;

                    targetWeeks.forEach((w: number) => {
                        if (!studentWeeksPresent.has(w)) absencesInConfig++;
                    });

                    if (absencesInConfig >= (config.threshold || 0)) {
                        warnings[config.label] = "Warning";
                    }
                });
            }

            reportData.push({
                studentName: student.name,
                studentId: student.studentId,
                sectionNumber: section.sectionNumber,
                attendance: attendanceMap,
                warnings
            });
        });
    });

    return {
        courseName: course.name,
        weeks: sortedWeeks,
        warningConfigs: JSON.parse(JSON.stringify((course as any).warningConfigs || [])),
        data: reportData
    };
}

