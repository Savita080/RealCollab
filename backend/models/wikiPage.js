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
        type: String, // Usually stored as a TipTap JSON string or Markdown
        default: ""
    }
}, {
    timestamps: true
});

const WikiPage = mongoose.model('WikiPage', wikiPageSchema);
export default WikiPage;
