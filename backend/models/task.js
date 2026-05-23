import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    project: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true 
    },
    title: { 
        type: String, 
        required: [true, 'Task title is required'],
        trim: true
    },
    description: { 
        type: String, 
        default: '' 
    },
    status: { 
        type: String, 
        enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'], 
        default: 'TODO' 
    },
    priority: { 
        type: String, 
        enum: ['P0', 'P1', 'P2'], 
        default: 'P2' 
    },
    assignee: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    dueDate: { 
        type: Date, 
        default: null 
    },
    position: { 
        type: Number, 
        required: true 
    },
    labels: [{ 
        type: String 
    }]
}, {
    timestamps: true 
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
