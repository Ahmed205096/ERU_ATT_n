import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWarningConfig {
    label: string;
    type: "absences_count" | "specific_weeks";
    threshold?: number;
    weeks?: number[];
}

export interface ICourse extends Document {
    name: string;
    sections: mongoose.Types.ObjectId[];
    warningConfigs: IWarningConfig[];
}

const CourseSchema = new Schema<ICourse>({
    name: { type: String, required: true },
    sections: [{ type: Schema.Types.ObjectId, ref: "Section" }],
    warningConfigs: [
        {
            label: { type: String, required: true },
            type: { type: String, enum: ["absences_count", "specific_weeks"], required: true },
            threshold: { type: Number },
            weeks: [{ type: Number }],
        },
    ],
});

// Next.js Hot Reloading fix for Mongoose schemas
if (process.env.NODE_ENV === "development" && mongoose.models.Course) {
    delete mongoose.models.Course;
}

const Course: Model<ICourse> = mongoose.models.Course || mongoose.model<ICourse>("Course", CourseSchema);

export default Course;
