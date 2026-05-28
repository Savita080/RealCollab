import WikiPage from '../models/wikiPage.js';
import WikiPageVersion from '../models/wikiPageVersion.js';
import WikiFolder from '../models/wikiFolder.js';
import { logProjectActivity } from '../utils/activityLogger.js';
import { PROJ_ACTIONS, OBJECT_TYPES } from '../utils/activityActions.js';

// ─────────────────────────────────────────────
// WIKI PAGE ENDPOINTS
// ─────────────────────────────────────────────

export const createWikiPage = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, content, folderId } = req.body;

        const newPage = await WikiPage.create({
            project: projectId,
            title,
            content,
            folder: folderId ?? null
        });

        // Automatically save the first "Version Snapshot"
        await WikiPageVersion.create({
            wikiPage: newPage._id,
            content: newPage.content || "",
            savedBy: req.userId,
            commitMessage: "Initial page creation"
        });

        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: projectId,
            user: req.userId,
            action: PROJ_ACTIONS.WIKI_CREATED,
            objectType: OBJECT_TYPES.WIKI,
            targetId: newPage._id,
            targetName: title || 'Untitled page',
        });

        res.status(201).json({ message: "Wiki page created", page: newPage });
    } catch (error) {
        console.error("Error creating wiki page:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getProjectWikiPages = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Include folder + order so the sidebar can build its tree.
        // Still omit `content` for performance — only titles are needed here.
        const pages = await WikiPage.find({ project: projectId })
            .select('title folder order prevPage nextPage createdAt updatedAt')
            .lean();

        res.status(200).json({ pages });
    } catch (error) {
        console.error("Error fetching wiki pages:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getWikiPageById = async (req, res) => {
    try {
        const { pageId } = req.params;
        const page = await WikiPage.findById(pageId)
            .populate('prevPage', 'title')
            .populate('nextPage', 'title');

        if (!page) return res.status(404).json({ message: "Page not found" });

        res.status(200).json({ page });
    } catch (error) {
        console.error("Error fetching wiki page:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateWikiPage = async (req, res) => {
    try {
        const { pageId, projectId, workspaceId } = req.params;
        const { title, content, commitMessage, folderId, prevPage, nextPage } = req.body;

        const before = await WikiPage.findById(pageId);
        if (!before) return res.status(404).json({ message: "Page not found" });

        // Content changes require a descriptive commit message
        if (content !== undefined) {
            if (!commitMessage || commitMessage.trim().length < 10) {
                return res.status(400).json({
                    message: "Please provide a descriptive commit message explaining what you changed."
                });
            }
        }

        // Build update object — only include fields that were sent
        const updateFields = {};
        if (title !== undefined) updateFields.title = title;
        if (content !== undefined) updateFields.content = content;
        if (folderId !== undefined) updateFields.folder = folderId ?? null;
        if (prevPage !== undefined) updateFields.prevPage = prevPage ?? null;
        if (nextPage !== undefined) updateFields.nextPage = nextPage ?? null;

        const updatedPage = await WikiPage.findByIdAndUpdate(pageId, updateFields, { new: true })
            .populate('prevPage', 'title')
            .populate('nextPage', 'title');

        if (!updatedPage) return res.status(404).json({ message: "Page not found" });

        const base = {
            workspace: workspaceId,
            project: projectId,
            user: req.userId,
            objectType: OBJECT_TYPES.WIKI,
            targetId: pageId,
            targetName: updatedPage.title || 'Untitled page',
        };

        if (title !== undefined && title !== before.title) {
            await logProjectActivity({
                ...base,
                action: PROJ_ACTIONS.WIKI_METADATA_UPDATED,
                metadata: { previousTitle: before.title },
            });
        }

        // Save a version snapshot whenever content changes
        if (content !== undefined) {
            await WikiPageVersion.create({
                wikiPage: pageId,
                content,
                savedBy: req.userId,
                commitMessage: commitMessage.trim()
            });
            await logProjectActivity({
                ...base,
                action: PROJ_ACTIONS.WIKI_UPDATED,
                metadata: { commitMessage },
            });
        }

        res.status(200).json({ message: "Page updated", page: updatedPage });
    } catch (error) {
        console.error("Error updating wiki page:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getWikiPageVersions = async (req, res) => {
    try {
        const { pageId } = req.params;
        const versions = await WikiPageVersion.find({ wikiPage: pageId })
            .populate('savedBy', 'name avatar')
            .sort('-createdAt');

        res.status(200).json({ versions });
    } catch (error) {
        console.error("Error fetching versions:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteWikiPage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const deleted = await WikiPage.findByIdAndDelete(pageId);

        if (!deleted) return res.status(404).json({ message: "Page not found" });

        await WikiPageVersion.deleteMany({ wikiPage: pageId });

        // Clear dangling prev/next references on sibling pages
        await WikiPage.updateMany(
            { $or: [{ prevPage: pageId }, { nextPage: pageId }] },
            { $unset: { prevPage: '', nextPage: '' } }
        );

        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: req.params.projectId,
            user: req.userId,
            action: PROJ_ACTIONS.WIKI_DELETED,
            objectType: OBJECT_TYPES.WIKI,
            targetId: deleted._id,
            targetName: deleted.title || 'Untitled page',
        });

        res.status(200).json({ message: "Page deleted" });
    } catch (error) {
        console.error("Error deleting wiki page:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ─────────────────────────────────────────────
// WIKI FOLDER ENDPOINTS
// ─────────────────────────────────────────────

export const createWikiFolder = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, parentId } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Folder name is required." });
        }

        // Prevent unlimited depth — only allow 2 levels (root + 1 nested)
        if (parentId) {
            const parent = await WikiFolder.findById(parentId);
            if (!parent) return res.status(404).json({ message: "Parent folder not found." });
            if (parent.parent) {
                return res.status(400).json({ message: "Folders can only be nested one level deep." });
            }
        }

        const folder = await WikiFolder.create({
            project: projectId,
            name: name.trim(),
            parent: parentId ?? null
        });

        res.status(201).json({ message: "Folder created", folder });
    } catch (error) {
        console.error("Error creating wiki folder:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getProjectWikiFolders = async (req, res) => {
    try {
        const { projectId } = req.params;
        const folders = await WikiFolder.find({ project: projectId }).sort('order name').lean();
        res.status(200).json({ folders });
    } catch (error) {
        console.error("Error fetching wiki folders:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateWikiFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Folder name is required." });
        }

        const updated = await WikiFolder.findByIdAndUpdate(
            folderId,
            { name: name.trim() },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: "Folder not found." });

        res.status(200).json({ message: "Folder renamed", folder: updated });
    } catch (error) {
        console.error("Error updating wiki folder:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteWikiFolder = async (req, res) => {
    try {
        const { folderId, projectId } = req.params;

        // Move all pages inside this folder back to root
        await WikiPage.updateMany(
            { project: projectId, folder: folderId },
            { $set: { folder: null } }
        );

        // Move child folders to root (un-nest them)
        await WikiFolder.updateMany(
            { parent: folderId },
            { $set: { parent: null } }
        );

        const deleted = await WikiFolder.findByIdAndDelete(folderId);
        if (!deleted) return res.status(404).json({ message: "Folder not found." });

        res.status(200).json({ message: "Folder deleted" });
    } catch (error) {
        console.error("Error deleting wiki folder:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Move a page into a folder (or to root when folderId is null)
export const moveWikiPage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { folderId } = req.body; // null = root

        const updated = await WikiPage.findByIdAndUpdate(
            pageId,
            { folder: folderId ?? null },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: "Page not found." });

        res.status(200).json({ message: "Page moved", page: updated });
    } catch (error) {
        console.error("Error moving wiki page:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};