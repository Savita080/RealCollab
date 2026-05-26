import mongoose from 'mongoose';

const projectMessageSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
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
    },
    reactions: [{
        emoji: { type: String, required: true },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    }]
}, { timestamps: true });

const ProjectMessage = mongoose.model('ProjectMessage', projectMessageSchema);
export default ProjectMessage;
