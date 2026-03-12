import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettings extends Document {
    currentWeek: number;
    isCheckInActive: boolean;
    activeCourseId?: string | null;
}

const SettingsSchema = new Schema<ISettings>({
    currentWeek: { type: Number, default: 1 },
    isCheckInActive: { type: Boolean, default: false },
    activeCourseId: { type: String, default: null },
});

const Settings: Model<ISettings> =
    mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings;
