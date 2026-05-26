import Task from '../models/task.js';
import Project from '../models/project.js';
import Workspace from '../models/workspace.js';
import redis from '../config/redis.js';

// In-memory fallback so presence works even when Redis is not configured
const memSocketUser = new Map(); // socketId -> { userId, name }

async function resolveUserId(socketId) {
    if (redis) {
        const id = await redis.get(`socket:${socketId}`);
        if (id) return String(id);
    }
    const mem = memSocketUser.get(socketId);
    return mem?.userId || null;
}

// Returns true if userId is allowed to mutate tasks in the given project.
// Project CONTRIBUTOR or workspace OWNER/ADMIN qualify.
async function canEditProject(userId, projectId) {
    if (!userId || !projectId) return false;
    const project = await Project.findById(projectId).select('members workspace').lean();
    if (!project) return false;
    const member = project.members?.find(m => m.user.toString() === userId);
    if (member?.role === 'CONTRIBUTOR') return true;
    const workspace = await Workspace.findById(project.workspace).select('members').lean();
    const wsm = workspace?.members?.find(m => m.user.toString() === userId);
    return wsm?.role === 'OWNER' || wsm?.role === 'ADMIN';
}

export const setupKanbanSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        // WHEN A USER LOGS IN (Tracking Presence)
        socket.on('user_online', async (payload) => {
            // payload can be userId string or { userId, name }
            const userId = payload?.userId || payload;
            const name = payload?.name || '';
            if (!userId) return;
            memSocketUser.set(socket.id, { userId: String(userId), name });
            if (redis) {
                await redis.set(`user:online:${userId}`, socket.id);
                await redis.set(`socket:${socket.id}`, String(userId));
                if (name) await redis.set(`user:name:${userId}`, name);
                console.log(`[Redis] User ${userId} is now online!`);
            }
            // Re-broadcast presence for any room this socket is already in
            for (const room of socket.rooms) {
                if (room !== socket.id) await broadcastPresence(io, room, redis);
            }
        });

        // 1. JOIN ROOM: The frontend tells us which project they are looking at
        socket.on('join_project', async (projectId) => {
            socket.join(projectId);
            console.log(`[Socket] User ${socket.id} joined project room: ${projectId}`);
            await broadcastPresence(io, projectId, redis);
        });

        // 2. LEAVE ROOM: They clicked away to a different page
        socket.on('leave_project', async (projectId) => {
            socket.leave(projectId);
            console.log(`[Socket] User ${socket.id} left project room: ${projectId}`);
            await broadcastPresence(io, projectId, redis);
        });

        // WORKSPACE ROOMS: for workspace-level chat broadcasts
        socket.on('join_workspace', (workspaceId) => {
            socket.join(`workspace_${workspaceId}`);
            console.log(`[Socket] User ${socket.id} joined workspace room: workspace_${workspaceId}`);
        });

        socket.on('leave_workspace', (workspaceId) => {
            socket.leave(`workspace_${workspaceId}`);
            console.log(`[Socket] User ${socket.id} left workspace room: workspace_${workspaceId}`);
        });

        // 3. TYPING INDICATOR: User is typing in chat
        socket.on('typing', ({ projectId, userName }) => {
            if (!projectId || !userName) return;
            socket.to(projectId).emit('user_typing', { userName, projectId });
        });

        socket.on('workspace_typing', ({ workspaceId, userName }) => {
            if (!workspaceId || !userName) return;
            socket.to(`workspace_${workspaceId}`).emit('workspace_user_typing', { userName, workspaceId });
        });

        // 4. MOVE TASK: The user dragged a card!
        socket.on('task_move', async (data) => {
            const { taskId, projectId, newStatus, newPosition } = data;

            // Authorization: only project CONTRIBUTORs (or ws OWNER/ADMIN) may move tasks.
            const userId = await resolveUserId(socket.id);
            const allowed = await canEditProject(userId, projectId);
            if (!allowed) {
                socket.emit('task_move_error', { taskId, reason: 'forbidden' });
                return;
            }

            // Broadcast the movement to everyone ELSE in the room immediately!
            socket.to(projectId).emit('task_moved', {
                taskId,
                status: newStatus,
                position: newPosition
            });

            try {
                // Save the new position to MongoDB
                await Task.findByIdAndUpdate(taskId, {
                    status: newStatus,
                    position: newPosition
                });
            } catch (error) {
                console.error("[Socket] Failed to save task move to DB:", error);
                // If the DB fails, tell the frontend to revert the card
                socket.emit('task_move_error', { taskId });
            }
        });

        // WHEN A USER LOGS OUT / CLOSES TAB
        socket.on('disconnect', async () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);
            // Snapshot rooms BEFORE we lose the socket reference
            const rooms = [...socket.rooms].filter(r => r !== socket.id);
            if (redis) {
                const userId = await redis.get(`socket:${socket.id}`);
                if (userId) {
                    await redis.del(`user:online:${userId}`);
                    await redis.del(`socket:${socket.id}`);
                    console.log(`[Redis] User ${userId} is now offline.`);
                }
            }
            memSocketUser.delete(socket.id);
            for (const room of rooms) {
                await broadcastPresence(io, room, redis);
            }
        });
    });
};

async function broadcastPresence(io, projectId, redis) {
    const room = io.sockets.adapter.rooms.get(projectId);
    if (!room) return;
    const seen = new Set();
    const online = [];
    for (const socketId of room) {
        let userId = null;
        let name = null;
        if (redis) {
            userId = await redis.get(`socket:${socketId}`);
            if (userId) name = await redis.get(`user:name:${userId}`);
        }
        if (!userId) {
            const mem = memSocketUser.get(socketId);
            if (mem) { userId = mem.userId; name = mem.name; }
        }
        if (userId && !seen.has(userId)) {
            seen.add(userId);
            online.push({ _id: userId, name: name || 'User' });
        }
    }
    io.to(projectId).emit('presence:update', online);
}
