import Whiteboard from '../models/whiteboard.js';
import { logProjectActivity } from '../utils/activityLogger.js';
import { PROJ_ACTIONS, OBJECT_TYPES } from '../utils/activityActions.js';

export const createWhiteboard = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name } = req.body;
        
        const boardName = name || "Untitled Whiteboard";
        const newWhiteboard = await Whiteboard.create({
            project: projectId,
            name: boardName,
            canvasState: "[]" // Empty Excalidraw state
        });

        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: projectId,
            user: req.userId,
            action: PROJ_ACTIONS.WHITEBOARD_CREATED,
            objectType: OBJECT_TYPES.WHITEBOARD,
            targetId: newWhiteboard._id,
            targetName: boardName,
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

export const updateWhiteboard = async (req, res) => {
    try {
        const { whiteboardId, projectId, workspaceId } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Whiteboard name is required" });
        }

        const before = await Whiteboard.findOne({ _id: whiteboardId, project: projectId });
        if (!before) return res.status(404).json({ message: "Whiteboard not found" });

        const updated = await Whiteboard.findByIdAndUpdate(
            whiteboardId,
            { name: name.trim() },
            { new: true },
        );

        if (before.name !== updated.name) {
            await logProjectActivity({
                workspace: workspaceId,
                project: projectId,
                user: req.userId,
                action: PROJ_ACTIONS.WHITEBOARD_RENAMED,
                objectType: OBJECT_TYPES.WHITEBOARD,
                targetId: whiteboardId,
                targetName: updated.name,
                metadata: { previousName: before.name, newName: updated.name },
            });
        }

        res.status(200).json({ message: "Whiteboard updated", whiteboard: updated });
    } catch (error) {
        console.error("Error updating whiteboard:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteWhiteboard = async (req, res) => {
    try {
        const { whiteboardId, projectId } = req.params;
        const deleted = await Whiteboard.findOneAndDelete({ _id: whiteboardId, project: projectId });
        if (!deleted) return res.status(404).json({ message: "Whiteboard not found" });

        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: req.params.projectId,
            user: req.userId,
            action: PROJ_ACTIONS.WHITEBOARD_DELETED,
            objectType: OBJECT_TYPES.WHITEBOARD,
            targetId: deleted._id,
            targetName: deleted.name || 'Untitled Whiteboard',
        });

        res.status(200).json({ message: "Whiteboard deleted" });
    } catch (error) {
        console.error("Error deleting whiteboard:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
