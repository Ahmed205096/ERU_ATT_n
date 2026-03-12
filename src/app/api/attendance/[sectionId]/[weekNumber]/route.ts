import dbConnect from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Section from "@/models/Section";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sectionId: string; weekNumber: string }> }
) {
    try {
        await dbConnect();
        const { sectionId, weekNumber } = await params;
        const week = parseInt(weekNumber);

        const attendance = await Attendance.findOne({
            sectionId,
            weekNumber: week,
        }).lean();

        if (!attendance) {
            return NextResponse.json({
                presentStudents: [],
                count: 0,
                students: [],
            });
        }

        // Get section to map student IDs to names
        const section = await Section.findById(sectionId).lean();
        const studentMap = new Map(
            section?.students.map((s) => [s.studentId, s.name]) || []
        );

        const students = attendance.presentStudents.map((id) => ({
            studentId: id,
            name: studentMap.get(id) || "Unknown",
        }));

        return NextResponse.json({
            presentStudents: attendance.presentStudents,
            count: attendance.presentStudents.length,
            students,
        });
    } catch (error) {
        console.error("Attendance API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch attendance" },
            { status: 500 }
        );
    }
}
