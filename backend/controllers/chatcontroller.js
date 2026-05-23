import ProjectMessage from '../models/projectMessage.js';

export const sendMessage = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { content } = req.body;

        if (!content) return res.status(400).json({ message: "Message content is required" });

        const newMessage = await ProjectMessage.create({
            project: projectId,
            sender: req.userId,
            content
        });

        // Populate sender info for the frontend UI
        const populatedMessage = await ProjectMessage.findById(newMessage._id).populate('sender', 'name avatar');

        // Make it LIVE! Broadcast to everyone in the project room
        req.io.to(projectId).emit('new_group_message', populatedMessage);

        res.status(201).json({ message: "Message sent", chatMessage: populatedMessage });
    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getProjectMessages = async (req, res) => {
    try {
        const { projectId } = req.params;
        const messages = await ProjectMessage.find({ project: projectId })
            .populate('sender', 'name avatar')
            .sort('createdAt'); // Oldest first (like normal chat history)
            
        res.status(200).json({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
