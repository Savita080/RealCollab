import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
  },
  scope: {
    type: String,
    enum: ['WORKSPACE', 'PROJECT'],
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  objectType: {
    type: String,
    enum: ['SNIPPET', 'WIKI', 'KANBAN', 'WHITEBOARD', 'PROJECT', 'WORKSPACE', 'MEMBER', 'AI'],
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  targetName: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined,
  },
}, { timestamps: true });

activityLogSchema.index({ workspace: 1, scope: 1, createdAt: -1 });
activityLogSchema.index({ project: 1, scope: 1, createdAt: -1 });
activityLogSchema.index({ workspace: 1, project: 1, createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
