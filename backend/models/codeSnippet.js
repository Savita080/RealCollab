import mongoose from 'mongoose';

const codeSnippetSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    tags: [{
        type: String
    }]
}, {
    timestamps: true
});

const CodeSnippet = mongoose.model('CodeSnippet', codeSnippetSchema);
export default CodeSnippet;
