import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeam extends Document {
    courseId: mongoose.Types.ObjectId;
    ideaId?: mongoose.Types.ObjectId;
    leaderId: string; // studentId
    members: string[]; // array of studentIds
    sectionNumber: string;
    day: string;
    period: string;
    customIdea?: {
        title: string;
        description: string;
    };
}

const TeamSchema = new Schema<ITeam>({
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    ideaId: { type: Schema.Types.ObjectId, ref: "ProjectIdea" },
    leaderId: { type: String, required: true },
    members: [{ type: String, required: true }],
    sectionNumber: { type: String, required: true },
    day: { type: String, required: true },
    period: { type: String, required: true },
    customIdea: {
        title: { type: String },
        description: { type: String }
    }
}, { timestamps: true });

// Ensure a student isn't in multiple teams for the same course (we'll also enforce this in business logic)
TeamSchema.index({ courseId: 1, leaderId: 1 }, { unique: true });

// Next.js Hot Reloading fix for Mongoose schemas
// This block is specifically for development to allow model redefinition during hot-reloads.
// In production, NODE_ENV will not be "development", so this block is skipped,
// and the model is safely retrieved or created using the mongoose.models check below.
if (process.env.NODE_ENV === "development" && mongoose.models.Team) {
    delete mongoose.models.Team;
}

const Team: Model<ITeam> =
    mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default Team;
