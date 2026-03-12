import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudent {
    studentId: string;
    name: string;
}

export interface ISection extends Document {
    sectionNumber: string;
    courseId: mongoose.Types.ObjectId;
    students: IStudent[];
}

const SectionSchema = new Schema<ISection>({
    sectionNumber: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    students: [
        {
            studentId: { type: String, required: true },
            name: { type: String, required: true },
        },
    ],
});

// Next.js Hot Reloading fix for Mongoose schemas
if (process.env.NODE_ENV === "development" && mongoose.models.Section) {
    delete mongoose.models.Section;
}

const Section: Model<ISection> =
    mongoose.models.Section || mongoose.model<ISection>("Section", SectionSchema);

export default Section;
