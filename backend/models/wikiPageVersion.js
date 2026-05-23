import mongoose from 'mongoose';

const wikiPageVersionSchema = new mongoose.Schema({
    wikiPage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    savedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    // We only need createdAt for versions, which timestamps: true will provide
    timestamps: true 
});

const WikiPageVersion = mongoose.model('WikiPageVersion', wikiPageVersionSchema);
export default WikiPageVersion;
