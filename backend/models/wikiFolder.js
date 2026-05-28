import mongoose from 'mongoose';

const wikiFolderSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiFolder',
        default: null   // null = root level
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const WikiFolder = mongoose.model('WikiFolder', wikiFolderSchema);
export default WikiFolder;