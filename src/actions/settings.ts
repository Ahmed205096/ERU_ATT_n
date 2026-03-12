"use server";

import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { revalidatePath } from "next/cache";

export async function getSettings() {
    await dbConnect();
    // Attempt to find settings; create if none exist
    let settings = await Settings.findOne().lean();
    if (!settings) {
        settings = await Settings.create({ currentWeek: 1, isCheckInActive: false });
    }
    return JSON.parse(JSON.stringify(settings));
}

export async function updateSettings(data: { currentWeek?: number; isCheckInActive?: boolean; activeCourseId?: string | null }) {
    await dbConnect();
    const settings = await Settings.findOneAndUpdate({}, data, { upsert: true, new: true }).lean();
    revalidatePath("/admin");
    revalidatePath("/");
    return JSON.parse(JSON.stringify(settings));
}
