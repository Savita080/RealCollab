import Task from '../models/task.js';

export const setupKanbanSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

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

        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);
        });
    });
};
