import mongoose from 'mongoose';

const StudentAdminSchema = new mongoose.Schema({
    courseId: { type: String, required: true }, // Use string if that's how it's handled in other models for consistency
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Simple password for now as per user request (User Name and Password)
    appointedByTA: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Next.js Hot Reloading fix for Mongoose schemas
if (process.env.NODE_ENV === "development" && mongoose.models.StudentAdmin) {
    delete mongoose.models.StudentAdmin;
}

export default mongoose.models.StudentAdmin || mongoose.model('StudentAdmin', StudentAdminSchema);
