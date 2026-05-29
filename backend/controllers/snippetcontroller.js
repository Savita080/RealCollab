import CodeSnippet from '../models/codeSnippet.js';
import { logProjectActivity } from '../utils/activityLogger.js';
import { PROJ_ACTIONS, OBJECT_TYPES } from '../utils/activityActions.js';

export const createSnippet = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, language, code, description, tags } = req.body;

        const newSnippet = await CodeSnippet.create({
            project: projectId,
            title,
            language,
            code,
            description,
            tags
        });

        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: projectId,
            user: req.userId,
            action: PROJ_ACTIONS.SNIPPET_CREATED,
            objectType: OBJECT_TYPES.SNIPPET,
            targetId: newSnippet._id,
            targetName: title || 'Untitled snippet',
        });

        res.status(201).json({ message: "Snippet created", snippet: newSnippet });
    } catch (error) {
        console.error("Error creating snippet:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getProjectSnippets = async (req, res) => {
    try {
        const { projectId } = req.params;
        const snippets = await CodeSnippet.find({ project: projectId }).sort('-createdAt');
        res.status(200).json({ snippets });
    } catch (error) {
        console.error("Error fetching snippets:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getSnippetById = async (req, res) => {
    try {
        const { id, projectId } = req.params;
        const snippet = await CodeSnippet.findOne({ _id: id, project: projectId });

        if (!snippet) return res.status(404).json({ message: "Snippet not found" });

        res.status(200).json({ snippet });
    } catch (error) {
        console.error("Error fetching snippet:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const SNIPPET_UPDATABLE = ['title', 'language', 'code', 'description', 'tags'];

export const updateSnippet = async (req, res) => {
    try {
        const { id, projectId, workspaceId } = req.params;

        const before = await CodeSnippet.findOne({ _id: id, project: projectId });
        if (!before) return res.status(404).json({ message: "Snippet not found" });

        const updates = {};
        for (const key of SNIPPET_UPDATABLE) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const updatedSnippet = await CodeSnippet.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedSnippet) return res.status(404).json({ message: "Snippet not found" });

        const codeChanged = updates.code !== undefined && updates.code !== before.code;
        const metaChanged = ['title', 'language', 'description', 'tags'].some(
            k => updates[k] !== undefined && updates[k] !== before[k],
        );

        const base = {
            workspace: workspaceId,
            project: projectId,
            user: req.userId,
            objectType: OBJECT_TYPES.SNIPPET,
            targetId: updatedSnippet._id,
            targetName: updatedSnippet.title || 'Untitled snippet',
        };

        if (codeChanged) {
            await logProjectActivity({ ...base, action: PROJ_ACTIONS.SNIPPET_UPDATED });
        }
        if (metaChanged) {
            await logProjectActivity({ ...base, action: PROJ_ACTIONS.SNIPPET_METADATA_UPDATED });
        }

        res.status(200).json({ message: "Snippet updated", snippet: updatedSnippet });
    } catch (error) {
        console.error("Error updating snippet:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteSnippet = async (req, res) => {
    try {
        const { id, projectId } = req.params;
        const deleted = await CodeSnippet.findOneAndDelete({ _id: id, project: projectId });

        if (!deleted) return res.status(404).json({ message: "Snippet not found" });

        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: req.params.projectId,
            user: req.userId,
            action: PROJ_ACTIONS.SNIPPET_DELETED,
            objectType: OBJECT_TYPES.SNIPPET,
            targetId: deleted._id,
            targetName: deleted.title || 'Untitled snippet',
        });

        res.status(200).json({ message: "Snippet deleted" });
    } catch (error) {
        console.error("Error deleting snippet:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
