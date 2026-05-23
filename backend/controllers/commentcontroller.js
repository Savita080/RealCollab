import TaskComment from '../models/taskComment.js';

export const createComment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: "Content is required" });
        }

        const newComment = await TaskComment.create({
            task: taskId,
            author: req.userId,
            content
        });

        // NOTE: The frontend should parse the content for "@Suhani" and 
        // make a separate POST request to /api/notifications to trigger the notification bus!
        
        res.status(201).json({ message: "Comment added", comment: newComment });
    } catch (error) {
        console.error("Error adding comment:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getTaskComments = async (req, res) => {
    try {
        const { taskId } = req.params;
        // Populate the author so the frontend gets their name and avatar
        const comments = await TaskComment.find({ task: taskId })
            .populate('author', 'name avatar')
            .sort('createdAt');
            
        res.status(200).json({ comments });
    } catch (error) {
        console.error("Error fetching comments:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const deletedComment = await TaskComment.findByIdAndDelete(commentId);
        
        if (!deletedComment) {
            return res.status(404).json({ message: "Comment not found" });
        }
        
        res.status(200).json({ message: "Comment deleted" });
    } catch (error) {
        console.error("Error deleting comment:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
