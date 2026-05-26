import TaskComment from '../models/taskComment.js';
import Task from '../models/task.js';
import Project from '../models/project.js';
import Workspace from '../models/workspace.js';
import { notifyMentions } from '../utils/notify.js';

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

        // Fetch the created comment and populate author so the live event has the name/avatar
        const populatedComment = await TaskComment.findById(newComment._id).populate('author', 'name avatar');

        if (req.body.projectId) {
            req.io.to(req.body.projectId).emit('task_comment_added', populatedComment);
        }

        // Notify @mentioned users — build proper workspace link AND scope to project members
        const senderName = populatedComment.author?.name || 'Someone';
        const snippet = content.slice(0, 80) + (content.length > 80 ? '…' : '');
        const task = await Task.findById(taskId).select('project').lean();
        const proj = task ? await Project.findById(task.project).select('workspace members').lean() : null;
        const notifLink = proj
            ? `/workspaces/${proj.workspace}/projects/${task.project}/kanban`
            : `/workspaces`;

        let allowedUserIds;
        if (proj) {
            const projMemberIds = (proj.members || []).map(m => m.user.toString());
            const workspace = await Workspace.findById(proj.workspace).select('members').lean();
            const wsAdminIds = (workspace?.members || [])
                .filter(m => m.role === 'OWNER' || m.role === 'ADMIN')
                .map(m => m.user.toString());
            allowedUserIds = [...new Set([...projMemberIds, ...wsAdminIds])];
        }

        notifyMentions(req.io, {
            content,
            sender: req.userId,
            type: 'MENTION',
            link: notifLink,
            contentBuilder: () => `${senderName} mentioned you in a comment: "${snippet}"`,
            allowedUserIds,
        }).catch(err => console.error('[comment mentions] failed:', err.message));

        res.status(201).json({ message: "Comment added", comment: populatedComment });
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
        const comment = await TaskComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Authorization: comment author OR project CONTRIBUTOR OR workspace OWNER/ADMIN.
        // The route lives under /api/tasks/:taskId/comments — so middleware can't see
        // workspace/project context; we resolve it here from the comment's task.
        const isAuthor = comment.author.toString() === req.userId.toString();
        let allowed = isAuthor;
        if (!allowed) {
            const task = await Task.findById(comment.task).select('project').lean();
            const proj = task ? await Project.findById(task.project).select('workspace members').lean() : null;
            if (proj) {
                const myProjRole = proj.members?.find(m => m.user.toString() === req.userId.toString())?.role;
                const ws = await Workspace.findById(proj.workspace).select('members').lean();
                const myWsRole = ws?.members?.find(m => m.user.toString() === req.userId.toString())?.role;
                const isWsAdmin = myWsRole === 'OWNER' || myWsRole === 'ADMIN';
                const isProjContributor = myProjRole === 'CONTRIBUTOR';
                allowed = isWsAdmin || isProjContributor;
            }
        }
        if (!allowed) {
            return res.status(403).json({ message: "You don't have permission to delete this comment." });
        }

        await TaskComment.findByIdAndDelete(commentId);

        // Make the deletion LIVE too!
        if (req.body.projectId) {
            req.io.to(req.body.projectId).emit('task_comment_deleted', {
                commentId,
                taskId: comment.task
            });
        }

        res.status(200).json({ message: "Comment deleted" });
    } catch (error) {
        console.error("Error deleting comment:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
