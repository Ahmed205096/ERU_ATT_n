import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProjectIdea extends Document {
    courseId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    source: "admin_manual" | "admin_pdf" | "student_custom";
    createdBy: string; // Admin ID or Student ID
    isApproved: boolean;
}

const ProjectIdeaSchema = new Schema<IProjectIdea>({
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    source: { 
        type: String, 
        enum: ["admin_manual", "admin_pdf", "student_custom"], 
        required: true 
    },
    createdBy: { type: String, required: true },
    isApproved: { type: Boolean, default: true },
}, { timestamps: true });

// Next.js Hot Reloading fix for Mongoose schemas
if (process.env.NODE_ENV === "development" && mongoose.models.ProjectIdea) {
    delete mongoose.models.ProjectIdea;
}

const ProjectIdea: Model<IProjectIdea> =
    mongoose.models.ProjectIdea || mongoose.model<IProjectIdea>("ProjectIdea", ProjectIdeaSchema);

export default ProjectIdea;
