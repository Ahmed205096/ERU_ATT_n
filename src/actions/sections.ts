"use server";

import dbConnect from "@/lib/mongodb";
import Section from "@/models/Section";
import Course from "@/models/Course";
import Attendance from "@/models/Attendance";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

export async function createSection(courseId: string, sectionNumber: string) {
    await dbConnect();
    const section = await Section.create({ courseId, sectionNumber });
    await Course.findByIdAndUpdate(courseId, {
        $push: { sections: section._id },
    });
    revalidatePath("/admin/sections");
    return JSON.parse(JSON.stringify(section));
}

export async function getSections(courseId?: string) {
    await dbConnect();
    const filter = courseId ? { courseId } : {};
    const sections = await Section.find(filter).populate("courseId").lean();
    return JSON.parse(JSON.stringify(sections));
}

export async function getSectionById(id: string) {
    await dbConnect();
    const section = await Section.findById(id).populate("courseId").lean();
    return JSON.parse(JSON.stringify(section));
}

export async function addStudent(
    sectionId: string,
    studentId: string,
    name: string
) {
    await dbConnect();
    await Section.findByIdAndUpdate(sectionId, {
        $push: { students: { studentId, name } },
    });
    revalidatePath("/admin/sections");
}

export async function removeStudent(sectionId: string, studentId: string) {
    await dbConnect();
    await Section.findByIdAndUpdate(sectionId, {
        $pull: { students: { studentId } },
    });
    revalidatePath("/admin/sections");
}

export async function importStudentsFromExcel(
    sectionId: string,
    fileBuffer: number[]
) {
    await dbConnect();
    const buffer = Buffer.from(fileBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const students: { studentId: string; name: string }[] = [];

    // Map of possible column names (English and Arabic)
    const idAliases = ["id", "student id", "studentid", "code", "رقم الطالب", "الكود", "كود الطالب", "الرقم الجامعي", "الرقم"];
    const nameAliases = ["name", "student name", "studentname", "full name", "اسم الطالب", "الاسم", "الاسم بالكامل"];

    // Strategy 1: Standard JSON object mapping (good for simple files)
    const dataObjects = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    let idKey: string | null = null;
    let nameKey: string | null = null;

    if (dataObjects.length > 0) {
        const keys = Object.keys(dataObjects[0]);
        for (const key of keys) {
            const kl = key.trim().toLowerCase();
            if (!idKey && idAliases.includes(kl)) idKey = key;
            if (!nameKey && nameAliases.includes(kl)) nameKey = key;
        }

        if (idKey && nameKey) {
            for (const row of dataObjects) {
                const rawId = String(row[idKey] || "").trim();
                const rawName = String(row[nameKey] || "").trim();
                if (rawId && rawName && /^\d+$/.test(rawId) && !/^\d+$/.test(rawName)) {
                    if (!idAliases.includes(rawId.toLowerCase())) {
                        students.push({ studentId: rawId, name: rawName });
                    }
                }
            }
        }
    }

    // Strategy 2: Raw Row Array Scan (Crucial for files with complex/merged headers like ERU)
    if (students.length === 0) {
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        let idColIndex = -1;
        let nameColIndex = -1;

        // Scan for header row
        for (let i = 0; i < Math.min(rows.length, 40); i++) {
            const row = rows[i];
            if (!Array.isArray(row)) continue;

            for (let j = 0; j < row.length; j++) {
                const cell = String(row[j] || "").trim().toLowerCase();
                if (idColIndex === -1 && idAliases.includes(cell)) idColIndex = j;
                if (nameColIndex === -1 && nameAliases.includes(cell)) nameColIndex = j;
            }

            if (idColIndex !== -1 && nameColIndex !== -1) {
                // Found headers, now collect data from subsequent rows
                for (let k = i + 1; k < rows.length; k++) {
                    const dataRow = rows[k];
                    if (!Array.isArray(dataRow)) continue;

                    const rawId = String(dataRow[idColIndex] || "").trim();
                    const rawName = String(dataRow[nameColIndex] || "").trim();

                    // Validation: ID numeric, Name not just numeric, skip repeats/headers
                    if (rawId && rawName && /^\d+$/.test(rawId) && !/^\d+$/.test(rawName)) {
                        students.push({ studentId: rawId, name: rawName });
                    }
                }
                break; // Stop scanning once we found the table and processed it
            }
        }
    }

    if (students.length > 0) {
        await Section.findByIdAndUpdate(sectionId, {
            $push: { students: { $each: students } },
        });
    }

    revalidatePath("/admin/sections");
    return { imported: students.length };
}

export async function deleteSection(id: string) {
    await dbConnect();
    const section = await Section.findById(id);
    if (section) {
        await Course.findByIdAndUpdate(section.courseId, {
            $pull: { sections: section._id },
        });
        await Attendance.deleteMany({ sectionId: id });
        await Section.findByIdAndDelete(id);
    }
    revalidatePath("/admin/sections");
}
