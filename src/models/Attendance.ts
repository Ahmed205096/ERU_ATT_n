import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
    sectionId: mongoose.Types.ObjectId;
    weekNumber: number;
    presentStudents: string[];
    timestamp: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    weekNumber: { type: Number, required: true },
    presentStudents: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
});

AttendanceSchema.index({ sectionId: 1, weekNumber: 1 }, { unique: true });

// Next.js Hot Reloading fix for Mongoose schemas
if (process.env.NODE_ENV === "development" && mongoose.models.Attendance) {
    delete mongoose.models.Attendance;
}

const Attendance: Model<IAttendance> =
    mongoose.models.Attendance ||
    mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;
