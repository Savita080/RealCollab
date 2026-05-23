import CodeSnippet from '../models/codeSnippet.js';

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
        const { id } = req.params;
        const snippet = await CodeSnippet.findById(id);
        
        if (!snippet) return res.status(404).json({ message: "Snippet not found" });
        
        res.status(200).json({ snippet });
    } catch (error) {
        console.error("Error fetching snippet:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateSnippet = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const updatedSnippet = await CodeSnippet.findByIdAndUpdate(id, updates, { new: true });
        
        if (!updatedSnippet) return res.status(404).json({ message: "Snippet not found" });
        
        res.status(200).json({ message: "Snippet updated", snippet: updatedSnippet });
    } catch (error) {
        console.error("Error updating snippet:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteSnippet = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await CodeSnippet.findByIdAndDelete(id);
        
        if (!deleted) return res.status(404).json({ message: "Snippet not found" });
        
        res.status(200).json({ message: "Snippet deleted" });
    } catch (error) {
        console.error("Error deleting snippet:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
