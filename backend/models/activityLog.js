import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String, // e.g., 'CREATED_TASK', 'COMPLETED_TASK', 'UPLOADED_FILE'
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId, // ID of the task, file, etc.
        required: true
    },
    targetName: {
        type: String // e.g., 'Fix Login Bug'
    }
}, { timestamps: true });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
