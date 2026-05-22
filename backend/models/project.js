import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    workspace: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Workspace', 
        required: true 
    },
    name: { 
        type: String, 
        required: [true, 'Project name is required'],
        trim: true
    },
    description: { 
        type: String, 
        default: '' 
    }
}, {
    timestamps: true 
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
