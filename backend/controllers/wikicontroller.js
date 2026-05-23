import WikiPage from '../models/wikiPage.js';
import WikiPageVersion from '../models/wikiPageVersion.js';

export const createWikiPage = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, content } = req.body;

        const newPage = await WikiPage.create({
            project: projectId,
            title,
            content
        });

        // Automatically save the first "Version Snapshot"
        await WikiPageVersion.create({
            wikiPage: newPage._id,
            content: newPage.content || "",
            savedBy: req.userId,
            commitMessage: "Initial page creation"
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

        // Performance tip: Don't fetch the massive content field, just fetch titles for the sidebar list
        const pages = await WikiPage.find({ project: projectId }).select('title createdAt updatedAt');

        res.status(200).json({ pages });
    } catch (error) {
        console.error("Error fetching wiki pages:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getWikiPageById = async (req, res) => {
    try {
        const { pageId } = req.params;
        const page = await WikiPage.findById(pageId);

        if (!page) return res.status(404).json({ message: "Page not found" });

        res.status(200).json({ page });
    } catch (error) {
        console.error("Error fetching wiki page:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateWikiPage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { title, content, commitMessage } = req.body;

        // strict rule: You cannot change content without a valid commit message!
        if (content !== undefined) {
            if (!commitMessage || commitMessage.trim().length < 10) {
                return res.status(400).json({ 
                    message: "Please provide a descriptive commit message explaining what you changed."
                });
            }
        }

        const updatedPage = await WikiPage.findByIdAndUpdate(pageId, { title, content }, { new: true });
        if (!updatedPage) return res.status(404).json({ message: "Page not found" });

        // If content was updated, save a snapshot version to the history log!
        if (content !== undefined) {
            await WikiPageVersion.create({
                wikiPage: pageId,
                content: content,
                savedBy: req.userId,
                commitMessage: commitMessage
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
            .sort('-createdAt'); // Newest snapshots first

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

        // Clean up: Delete all history versions associated with this page
        await WikiPageVersion.deleteMany({ wikiPage: pageId });

        res.status(200).json({ message: "Page deleted" });
    } catch (error) {
        console.error("Error deleting wiki page:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
