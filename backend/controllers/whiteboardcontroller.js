import Whiteboard from '../models/whiteboard.js';

export const createWhiteboard = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name } = req.body;
        
        const newWhiteboard = await Whiteboard.create({
            project: projectId,
            name: name || "Untitled Whiteboard",
            canvasState: "[]" // Empty Excalidraw state
        });
        
        res.status(201).json({ message: "Whiteboard created", whiteboard: newWhiteboard });
    } catch (error) {
        console.error("Error creating whiteboard:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getProjectWhiteboards = async (req, res) => {
    try {
        const { projectId } = req.params;
        // Don't send the massive canvas state string, just the metadata for the list UI
        const whiteboards = await Whiteboard.find({ project: projectId }).select('-canvasState');
        res.status(200).json({ whiteboards });
    } catch (error) {
        console.error("Error fetching whiteboards:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteWhiteboard = async (req, res) => {
    try {
        const { whiteboardId } = req.params;
        const deleted = await Whiteboard.findByIdAndDelete(whiteboardId);
        if (!deleted) return res.status(404).json({ message: "Whiteboard not found" });
        res.status(200).json({ message: "Whiteboard deleted" });
    } catch (error) {
        console.error("Error deleting whiteboard:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
