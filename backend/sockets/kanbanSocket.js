import Task from '../models/task.js';
import redis from '../config/redis.js';

export const setupKanbanSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        // WHEN A USER LOGS IN (Tracking Presence)
        socket.on('user_online', async (userId) => {
            if (redis) {
                await redis.set(`user:online:${userId}`, socket.id);
                await redis.set(`socket:${socket.id}`, userId); 
                console.log(`[Redis] User ${userId} is now online!`);
            }
        });

        // 1. JOIN ROOM: The frontend tells us which project they are looking at
        socket.on('join_project', (projectId) => {
            socket.join(projectId);
            console.log(`[Socket] User ${socket.id} joined project room: ${projectId}`);
        });

        // 2. LEAVE ROOM: They clicked away to a different page
        socket.on('leave_project', (projectId) => {
            socket.leave(projectId);
            console.log(`[Socket] User ${socket.id} left project room: ${projectId}`);
        });

        // 3. MOVE TASK: The user dragged a card!
        socket.on('task_move', async (data) => {
            const { taskId, projectId, newStatus, newPosition } = data;

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
            if (redis) {
                const userId = await redis.get(`socket:${socket.id}`);
                if (userId) {
                    await redis.del(`user:online:${userId}`);
                    await redis.del(`socket:${socket.id}`);
                    console.log(`[Redis] User ${userId} is now offline.`);
                }
            }
        });
    });
};
