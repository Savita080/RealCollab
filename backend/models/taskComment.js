import mongoose from 'mongoose';

const taskCommentSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    author: {
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
}, {
    timestamps: true
});

const TaskComment = mongoose.model('TaskComment', taskCommentSchema);
export default TaskComment;
