import mongoose, { Schema, Document, Model } from "mongoose";

export interface IImportLog {
    sectionId: mongoose.Types.ObjectId;
    weekNumber: number;
    studentId: string;
}

export interface IImportHistory extends Document {
    timestamp: Date;
    filename: string;
    description: string;
    logs: IImportLog[];
}

const ImportHistorySchema = new Schema<IImportHistory>({
    timestamp: { type: Date, default: Date.now },
    filename: { type: String, required: true },
    description: { type: String },
    logs: [
        {
            sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true },
            weekNumber: { type: Number, required: true },
            studentId: { type: String, required: true },
        },
    ],
});

const ImportHistory: Model<IImportHistory> =
    mongoose.models.ImportHistory || mongoose.model<IImportHistory>("ImportHistory", ImportHistorySchema);

export default ImportHistory;
