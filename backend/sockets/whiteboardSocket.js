import Whiteboard from '../models/whiteboard.js';
import redis from '../config/redis.js';

export const setupWhiteboardSockets = (io) => {
    io.on('connection', (socket) => {
        
        // 1. Join a specific whiteboard room
        socket.on('join_whiteboard', async (whiteboardId) => {
            socket.join(`whiteboard:${whiteboardId}`);
            console.log(`[Socket] User ${socket.id} joined whiteboard ${whiteboardId}`);

            // Fetch the latest state from Redis to sync the new user instantly!
            if (redis) {
                const cachedState = await redis.get(`whiteboard:${whiteboardId}`);
                if (cachedState) {
                    socket.emit('whiteboard_sync', JSON.parse(cachedState));
                } else {
                    // Fallback to MongoDB if Redis is empty
                    const board = await Whiteboard.findById(whiteboardId);
                    if (board && board.canvasState) {
                        socket.emit('whiteboard_sync', JSON.parse(board.canvasState));
                        // Cache it in Redis for the next person
                        await redis.set(`whiteboard:${whiteboardId}`, board.canvasState);
                    }
                }
            }
        });

        // 2. Someone drew a line or moved a shape!
        socket.on('whiteboard_draw', async (data) => {
            const { whiteboardId, elements } = data; // elements is the Excalidraw state

            // Broadcast to everyone else immediately! 0-latency
            socket.to(`whiteboard:${whiteboardId}`).emit('whiteboard_update', elements);

            // Cache the live state in Redis immediately (Suhani's performance trick!)
            if (redis) {
                await redis.set(`whiteboard:${whiteboardId}`, JSON.stringify(elements));
            }
        });

        // 3. Save to MongoDB (Frontend should emit this every 10 seconds, not on every stroke)
        socket.on('save_whiteboard', async (data) => {
            const { whiteboardId, elements } = data;
            try {
                await Whiteboard.findByIdAndUpdate(whiteboardId, {
                    canvasState: JSON.stringify(elements)
                });
                console.log(`[MongoDB] Saved whiteboard ${whiteboardId}`);
            } catch (error) {
                console.error("Error saving whiteboard to DB:", error);
            }
        });

        socket.on('leave_whiteboard', (whiteboardId) => {
            socket.leave(`whiteboard:${whiteboardId}`);
            console.log(`[Socket] User ${socket.id} left whiteboard ${whiteboardId}`);
        });
    });
};
