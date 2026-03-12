"use server";

import dbConnect from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import ImportHistory from "@/models/ImportHistory";
import { revalidatePath } from "next/cache";

interface ImportData {
    sectionId: string;
    filename: string;
    records: {
        studentId: string;
        weeks: number[]; // e.g. [1, 3] if present in week 1 and 3
    }[];
}

export async function importAttendanceAction(data: ImportData) {
    await dbConnect();
    const { sectionId, filename, records } = data;

    const logs: any[] = [];

    for (const record of records) {
        for (const week of record.weeks) {
            // Check if student is already present
            const existing = await Attendance.findOne({
                sectionId,
                weekNumber: week,
                presentStudents: record.studentId
            });

            if (!existing) {
                // Update attendance
                await Attendance.findOneAndUpdate(
                    { sectionId, weekNumber: week },
                    { 
                        $addToSet: { presentStudents: record.studentId },
                        $setOnInsert: { timestamp: new Date() }
                    },
                    { upsert: true }
                );

                logs.push({
                    sectionId,
                    weekNumber: week,
                    studentId: record.studentId,
                });
            }
        }
    }

    const history = await ImportHistory.create({
        filename,
        description: `Imported attendance for ${records.length} students across various weeks.`,
        logs,
    });

    revalidatePath("/admin/attendance");
    revalidatePath("/admin");

    return { success: true, historyId: history._id.toString() };
}

export async function getImportHistory() {
    await dbConnect();
    const history = await ImportHistory.find().sort({ timestamp: -1 }).limit(10).lean();
    return JSON.parse(JSON.stringify(history));
}

export async function undoImportAction(historyId: string) {
    await dbConnect();
    const history = await ImportHistory.findById(historyId);
    if (!history) throw new Error("Import history not found");

    for (const log of history.logs) {
        await Attendance.findOneAndUpdate(
            { sectionId: log.sectionId, weekNumber: log.weekNumber },
            { $pull: { presentStudents: log.studentId } }
        );
    }

    await ImportHistory.findByIdAndDelete(historyId);

    revalidatePath("/admin/attendance");
    revalidatePath("/admin");

    return { success: true };
}
