import mongoose from 'mongoose';

const whiteboardSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    name: {
        type: String,
        default: 'Untitled Whiteboard'
    },
    // We store the Excalidraw JSON string array here
    canvasState: {
        type: String, 
        default: '[]'
    }
}, {
    timestamps: true
});

const Whiteboard = mongoose.model('Whiteboard', whiteboardSchema);
export default Whiteboard;
