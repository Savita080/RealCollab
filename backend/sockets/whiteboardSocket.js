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

        // 2. Someone drew a line or moved a shape! (Receives ONLY the diff)
        socket.on('whiteboard_draw', async (data) => {
            const { whiteboardId, elements } = data; // elements is just the diff/changed shapes

            // Broadcast to everyone else immediately! 0-latency
            socket.to(`whiteboard:${whiteboardId}`).emit('whiteboard_update', elements);
            
            // Note: We DO NOT save to Redis here anymore, because `elements` is only a diff.
            // If we saved it here, we would accidentally overwrite the whole canvas with just the diff!
        });

        // 3. Save to MongoDB & Redis (Frontend should emit this every 10 seconds with the FULL array)
        socket.on('save_whiteboard', async (data) => {
            const { whiteboardId, elements } = data;
            try {
                const stringifiedElements = JSON.stringify(elements);
                
                // Save full state to MongoDB
                await Whiteboard.findByIdAndUpdate(whiteboardId, {
                    canvasState: stringifiedElements
                });
                
                // Save full state to Redis so new users joining get the full snapshot
                if (redis) {
                    await redis.set(`whiteboard:${whiteboardId}`, stringifiedElements);
                }
                
                console.log(`[MongoDB & Redis] Saved full whiteboard state ${whiteboardId}`);
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
