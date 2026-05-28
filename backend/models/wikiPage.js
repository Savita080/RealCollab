import mongoose from 'mongoose';

const wikiPageSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String, // TipTap JSON string or Markdown
        default: ""
    },
    // Folder organisation
    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiFolder',
        default: null   // null = root level (no folder)
    },
    order: {
        type: Number,
        default: 0
    },
    // Prerequisite / suggested-next navigation
    prevPage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage',
        default: null
    },
    nextPage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage',
        default: null
    }
}, {
    timestamps: true
});

const WikiPage = mongoose.model('WikiPage', wikiPageSchema);
export default WikiPage;