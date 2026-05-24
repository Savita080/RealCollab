import mongoose from 'mongoose';

const workspaceMessageSchema = new mongoose.Schema({
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    }
}, { timestamps: true });

const WorkspaceMessage = mongoose.model('WorkspaceMessage', workspaceMessageSchema);
export default WorkspaceMessage;
