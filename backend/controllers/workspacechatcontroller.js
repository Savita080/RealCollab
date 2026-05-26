import WorkspaceMessage from '../models/workspaceMessage.js';
import Workspace from '../models/workspace.js';
import { notifyMentions } from '../utils/notify.js';
import { toggleReaction } from '../utils/reactions.js';

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

        // Notify @mentioned users — scope to workspace members only so cross-workspace
        // name collisions don't ping the wrong person.
        const senderName = populatedMessage.sender?.name || 'Someone';
        const snippet = content.slice(0, 80) + (content.length > 80 ? '…' : '');
        const ws = await Workspace.findById(workspaceId).select('members').lean();
        const allowedUserIds = (ws?.members || []).map(m => m.user.toString());
        notifyMentions(req.io, {
            content,
            sender: req.userId,
            type: 'MENTION',
            link: `/workspaces/${req.params.workspaceId}/chat`,
            contentBuilder: () => `${senderName} mentioned you in workspace chat: "${snippet}"`,
            allowedUserIds,
        }).catch(err => console.error('[ws-chat mentions] failed:', err.message));

        res.status(201).json({ message: "Workspace message sent", data: populatedMessage });
    } catch (error) {
        console.error("Error sending workspace message:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const reactToWorkspaceMessage = async (req, res) => {
    try {
        const { workspaceId, messageId } = req.params;
        const { emoji } = req.body;
        const reactions = await toggleReaction(WorkspaceMessage, messageId, emoji, req.userId);
        if (req.io) {
            req.io.to(`workspace_${workspaceId}`).emit('message_reaction_updated', {
                scope: 'workspace',
                messageId,
                reactions,
            });
        }
        res.status(200).json({ reactions });
    } catch (err) {
        console.error('Error toggling workspace message reaction:', err.message);
        res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
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
