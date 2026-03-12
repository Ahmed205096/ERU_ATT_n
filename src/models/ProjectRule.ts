import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProjectRule extends Document {
    courseId: mongoose.Types.ObjectId;
    maxTeamSize: number;
    allowDuplicateIdeas: boolean;
}

const ProjectRuleSchema = new Schema<IProjectRule>({
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, unique: true },
    maxTeamSize: { type: Number, required: true, default: 4 },
    allowDuplicateIdeas: { type: Boolean, required: true, default: false },
});

// Next.js Hot Reloading fix for Mongoose schemas
if (process.env.NODE_ENV === "development" && mongoose.models.ProjectRule) {
    delete mongoose.models.ProjectRule;
}

const ProjectRule: Model<IProjectRule> =
    mongoose.models.ProjectRule || mongoose.model<IProjectRule>("ProjectRule", ProjectRuleSchema);

export default ProjectRule;
