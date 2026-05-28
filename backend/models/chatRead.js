import mongoose from 'mongoose';

const chatReadSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    lastReadAt: { type: Date, default: Date.now },
}, { timestamps: true });

chatReadSchema.index({ user: 1, project: 1 }, { unique: true });

const ChatRead = mongoose.model('ChatRead', chatReadSchema);
export default ChatRead;
