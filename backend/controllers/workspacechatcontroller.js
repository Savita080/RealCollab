import WorkspaceMessage from '../models/workspaceMessage.js';
import { notifyMentions } from '../utils/notify.js';

export const sendWorkspaceMessage = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: "Message content is required" });
        }

        const newMessage = await WorkspaceMessage.create({
            workspace: workspaceId,
            sender: req.userId,
            content
        });

        const populatedMessage = await newMessage.populate('sender', 'name avatar');

        // Broadcast to the entire workspace room
        if (req.io) {
            req.io.to(`workspace_${workspaceId}`).emit('new_workspace_message', populatedMessage);
        }

        // Notify @mentioned users
        const senderName = populatedMessage.sender?.name || 'Someone';
        const snippet = content.slice(0, 80) + (content.length > 80 ? '…' : '');
        notifyMentions(req.io, {
            content,
            sender: req.userId,
            type: 'MENTION',
            link: `/collab`,
            contentBuilder: () => `${senderName} mentioned you in workspace chat: "${snippet}"`,
        }).catch(err => console.error('[ws-chat mentions] failed:', err.message));

        res.status(201).json({ message: "Workspace message sent", data: populatedMessage });
    } catch (error) {
        console.error("Error sending workspace message:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getWorkspaceMessages = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        // Fetch last 50 messages for the workspace chat
        const messages = await WorkspaceMessage.find({ workspace: workspaceId })
            .populate('sender', 'name avatar')
            .sort('createdAt')
            .limit(50);

        res.status(200).json({ messages });
    } catch (error) {
        console.error("Error fetching workspace messages:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
