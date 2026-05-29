import TaskComment from '../models/taskComment.js';
import Task from '../models/task.js';
import Project from '../models/project.js';
import Workspace from '../models/workspace.js';
import { notifyMentions, notifyUser } from '../utils/notify.js';
import { toggleReaction } from '../utils/reactions.js';

const REPLY_POPULATE = { path: 'replyTo', select: 'content author', populate: { path: 'author', select: 'name' } };

// The comment routes live under /api/tasks/:taskId/comments, so there's no
// workspace/project in the URL for RBAC middleware to act on. We resolve the
// task → project → workspace and check membership in-controller.
// Returns { allowed, status, message, projectId, workspaceId, project }.
async function checkTaskAccess(taskId, userId, { requireContributor = false } = {}) {
    const task = await Task.findById(taskId).select('project').lean();
    if (!task) return { allowed: false, status: 404, message: "Task not found" };

    const proj = await Project.findById(task.project).select('workspace members').lean();
    if (!proj) return { allowed: false, status: 404, message: "Project not found" };

    const myProjRole = proj.members?.find(m => m.user.toString() === userId.toString())?.role;
    const ws = await Workspace.findById(proj.workspace).select('members').lean();
    const myWsRole = ws?.members?.find(m => m.user.toString() === userId.toString())?.role;
    const isWsAdmin = myWsRole === 'OWNER' || myWsRole === 'ADMIN';

    // Must be a project member OR a workspace admin to see/touch the task at all.
    if (!myProjRole && !isWsAdmin) {
        return { allowed: false, status: 403, message: "You are not a member of this project." };
    }
    // Posting/reacting requires contributor-level write access (ws admins bypass).
    if (requireContributor && !isWsAdmin && myProjRole !== 'CONTRIBUTOR') {
        return { allowed: false, status: 403, message: "You don't have permission to comment on this task." };
    }
    return { allowed: true, projectId: task.project.toString(), workspaceId: proj.workspace.toString(), project: proj };
}

export const createComment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content, replyTo } = req.body;

        if (!content) {
            return res.status(400).json({ message: "Content is required" });
        }

        const access = await checkTaskAccess(taskId, req.userId, { requireContributor: true });
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        // Validate replyTo belongs to the same task
        let validReplyTo = null;
        if (replyTo) {
            const parent = await TaskComment.findById(replyTo).select('task').lean();
            if (parent && parent.task.toString() === taskId) validReplyTo = replyTo;
        }

        const newComment = await TaskComment.create({
            task: taskId,
            author: req.userId,
            content,
            replyTo: validReplyTo,
        });

        // Fetch the created comment and populate author + replyTo for the live event
        const populatedComment = await TaskComment.findById(newComment._id)
            .populate('author', 'name avatar')
            .populate(REPLY_POPULATE);

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

        if (validReplyTo) {
            const parentAuthor = populatedComment.replyTo?.author?._id;
            if (parentAuthor) {
                notifyUser(req.io, {
                    recipient: parentAuthor,
                    sender: req.userId,
                    type: 'MENTION',
                    content: `${senderName} replied to your comment: "${snippet}"`,
                    link: notifLink,
                }).catch(err => console.error('[comment reply notify] failed:', err.message));
            }
        }

        res.status(201).json({ message: "Comment added", comment: populatedComment });
    } catch (error) {
        console.error("Error adding comment:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getTaskComments = async (req, res) => {
    try {
        const { taskId } = req.params;

        const access = await checkTaskAccess(taskId, req.userId);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        // Populate the author + replyTo so the frontend gets their name, avatar, and quote preview
        const comments = await TaskComment.find({ task: taskId })
            .populate('author', 'name avatar')
            .populate(REPLY_POPULATE)
            .sort('createdAt');
            
        res.status(200).json({ comments });
    } catch (error) {
        console.error("Error fetching comments:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const reactToComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { emoji } = req.body;

        // Resolve the comment → task and verify project membership before reacting.
        const comment = await TaskComment.findById(commentId).select('task').lean();
        if (!comment) return res.status(404).json({ message: "Comment not found" });
        const access = await checkTaskAccess(comment.task, req.userId);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        const reactions = await toggleReaction(TaskComment, commentId, emoji, req.userId);
        // Broadcast over the project room if the caller passed projectId (same pattern as create/delete)
        const projectId = req.body.projectId;
        if (projectId && req.io) {
            req.io.to(projectId).emit('comment_reaction_updated', {
                commentId,
                reactions,
            });
        }
        res.status(200).json({ reactions });
    } catch (err) {
        console.error('Error toggling comment reaction:', err.message);
        res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
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
