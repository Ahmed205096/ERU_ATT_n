"use server";

import dbConnect from "@/lib/mongodb";
import Section from "@/models/Section";
import Attendance from "@/models/Attendance";
import { revalidatePath } from "next/cache";
import { getSettings } from "./settings";

export async function lookupStudent(studentId: string) {
    await dbConnect();
    const sections = await Section.find({
        "students.studentId": studentId,
    })
        .populate("courseId")
        .lean();

    if (!sections || sections.length === 0) {
        return null;
    }

    const results = sections.map((section) => {
        const student = section.students.find((s) => s.studentId === studentId);
        const course = section.courseId as unknown as { _id: string; name: string };
        return {
            sectionId: String(section._id),
            sectionNumber: section.sectionNumber,
            courseId: course?._id ? String(course._id) : "",
            courseName: course?.name || "Unknown",
            studentName: student?.name || "Unknown",
            studentId,
        };
    });

    return JSON.parse(JSON.stringify(results));
}

export async function markPresent(
    sectionId: string,
    weekNumber: number,
    studentId: string
) {
    await dbConnect();

    // 1. First, check if the student is already marked present for THIS specific section and week
    const existing = await Attendance.findOne({
        sectionId,
        weekNumber,
        presentStudents: studentId,
    });

    if (existing) {
        return {
            success: false,
            message: "Student is already registered for this section this week.",
            alreadyPresent: true
        };
    }

    // 2. If not already present, add them
    await Attendance.findOneAndUpdate(
        { sectionId, weekNumber },
        {
            $addToSet: { presentStudents: studentId },
            $setOnInsert: { timestamp: new Date() },
        },
        { upsert: true, new: true }
    );

    revalidatePath("/admin/attendance");
    return { success: true };
}


export async function removeAttendance(
    sectionId: string,
    weekNumber: number,
    studentId: string
) {
    await dbConnect();

    await Attendance.findOneAndUpdate(
        { sectionId, weekNumber },
        { $pull: { presentStudents: studentId } }
    );

    revalidatePath("/admin/attendance");
    return { success: true };
}

export async function getAttendance(sectionId: string, weekNumber: number) {
    await dbConnect();

    const attendance = await Attendance.findOne({ sectionId, weekNumber }).lean();
    return JSON.parse(JSON.stringify(attendance));
}

export async function getAttendanceStats() {
    await dbConnect();

    const settings = await getSettings();
    const currentWeek = settings.currentWeek;

    const todayAttendance = await Attendance.find({
        weekNumber: currentWeek,
    }).lean();

    const totalCheckedIn = todayAttendance.reduce(
        (sum, a) => sum + (a.presentStudents?.length || 0),
        0
    );

    return JSON.parse(JSON.stringify({
        currentWeek,
        totalCheckedIn,
        sessionsActive: todayAttendance.length,
    }));
}

export async function autoMarkWeek(sectionId: string, targetWeek: number) {
    await dbConnect();
    
    // 1. Find all attendance records for this section across all weeks
    const allAttendance = await Attendance.find({ sectionId }).lean();
    
    // 2. Collect unique student IDs who have attended at least once
    const attendedStudents = new Set<string>();
    allAttendance.forEach((a) => {
        a.presentStudents?.forEach((id) => attendedStudents.add(id));
    });

    if (attendedStudents.size === 0) {
        return { success: true, count: 0 };
    }

    // 3. Update Target Week attendance with these students
    await Attendance.findOneAndUpdate(
        { sectionId, weekNumber: targetWeek },
        { 
            $addToSet: { presentStudents: { $each: Array.from(attendedStudents) } },
            $setOnInsert: { timestamp: new Date() }
        },
        { upsert: true, new: true }
    );

    revalidatePath("/admin/attendance");
    return { success: true, count: attendedStudents.size };
}
