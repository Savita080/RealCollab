import Whiteboard from '../models/whiteboard.js';
import Project from '../models/project.js';
import Workspace from '../models/workspace.js';
import redis from '../config/redis.js';
import fs from 'fs';
import path from 'path';

// Mirror of kanbanSocket's resolveUserId — keep in-memory map fallback when Redis is missing.
const memSocketUser = new Map();
async function resolveUserId(socketId) {
    if (redis) {
        const id = await redis.get(`socket:${socketId}`);
        if (id) return String(id);
    }
    const mem = memSocketUser.get(socketId);
    return mem?.userId || null;
}

// Boards inherit project RBAC: project CONTRIBUTOR or workspace OWNER/ADMIN may draw/save.
// Cached briefly so a flurry of draw events doesn't hammer Mongo.
const projectAuthCache = new Map(); // `${userId}:${projectId}` -> { allowed, until }
async function canEditWhiteboard(userId, whiteboardId) {
    if (!userId || !whiteboardId) return false;
    const board = await Whiteboard.findById(whiteboardId).select('project').lean();
    if (!board?.project) return false;
    const projectId = board.project.toString();
    const cacheKey = `${userId}:${projectId}`;
    const cached = projectAuthCache.get(cacheKey);
    if (cached && cached.until > Date.now()) return cached.allowed;
    const project = await Project.findById(projectId).select('members workspace').lean();
    if (!project) {
        projectAuthCache.set(cacheKey, { allowed: false, until: Date.now() + 5000 });
        return false;
    }
    const member = project.members?.find(m => m.user.toString() === userId);
    let allowed = member?.role === 'CONTRIBUTOR';
    if (!allowed) {
        const workspace = await Workspace.findById(project.workspace).select('members').lean();
        const wsm = workspace?.members?.find(m => m.user.toString() === userId);
        allowed = wsm?.role === 'OWNER' || wsm?.role === 'ADMIN';
    }
    projectAuthCache.set(cacheKey, { allowed, until: Date.now() + 15_000 });
    return allowed;
}

const _dbgLog = (payload) => {
    try {
        const line = JSON.stringify({ sessionId: '6711b2', timestamp: Date.now(), ...payload }) + '\n';
        fs.appendFileSync(path.join(process.cwd(), 'debug-6711b2.log'), line);
    } catch (_) {}
};

export const setupWhiteboardSockets = (io) => {
    io.on('connection', (socket) => {
        
        // 1. Join a specific whiteboard room
        socket.on('join_whiteboard', async (whiteboardId) => {
            socket.join(`whiteboard:${whiteboardId}`);
            console.log(`[Socket] User ${socket.id} joined whiteboard ${whiteboardId}`);

            let syncSource = 'none';
            let syncCount = 0;
            const emitSyncFromBoard = async (board) => {
                if (!board?.canvasState || board.canvasState === '[]') return;
                const parsed = JSON.parse(board.canvasState);
                syncCount = Array.isArray(parsed) ? parsed.length : 0;
                if (syncCount > 0) {
                    socket.emit('whiteboard_sync', parsed);
                    syncSource = 'mongo';
                    if (redis) await redis.set(`whiteboard:${whiteboardId}`, board.canvasState);
                }
            };

            // Fetch the latest state from Redis to sync the new user instantly!
            if (redis) {
                const cachedState = await redis.get(`whiteboard:${whiteboardId}`);
                if (cachedState) {
                    const parsed = JSON.parse(cachedState);
                    syncCount = Array.isArray(parsed) ? parsed.length : 0;
                    socket.emit('whiteboard_sync', parsed);
                    syncSource = 'redis';
                } else {
                    await emitSyncFromBoard(await Whiteboard.findById(whiteboardId));
                }
            } else {
                await emitSyncFromBoard(await Whiteboard.findById(whiteboardId));
            }
            // #region agent log
            _dbgLog({ hypothesisId: 'B', location: 'whiteboardSocket.js:join', message: 'join_whiteboard sync', data: { whiteboardId, redisConfigured: !!redis, syncSource, syncCount } });
            // #endregion
        });

        // 2. Someone drew a line or moved a shape! (Receives ONLY the diff)
        socket.on('whiteboard_draw', async (data) => {
            const { whiteboardId, elements } = data; // elements is just the diff/changed shapes

            // Authz: only project CONTRIBUTORs (or ws OWNER/ADMIN) may draw — viewers
            // joining the room can still receive whiteboard_update broadcasts (read-only).
            const userId = await resolveUserId(socket.id);
            const allowed = await canEditWhiteboard(userId, whiteboardId);
            if (!allowed) {
                socket.emit('whiteboard_error', { reason: 'forbidden', whiteboardId });
                return;
            }

            // Broadcast to everyone else immediately! 0-latency
            socket.to(`whiteboard:${whiteboardId}`).emit('whiteboard_update', elements);

            // Note: We DO NOT save to Redis here anymore, because `elements` is only a diff.
            // If we saved it here, we would accidentally overwrite the whole canvas with just the diff!
        });

        // 3. Save to MongoDB & Redis (Frontend should emit this every 10 seconds with the FULL array)
        socket.on('save_whiteboard', async (data) => {
            const { whiteboardId, elements } = data;

            const userId = await resolveUserId(socket.id);
            const allowed = await canEditWhiteboard(userId, whiteboardId);
            if (!allowed) {
                socket.emit('whiteboard_error', { reason: 'forbidden', whiteboardId });
                return;
            }

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
                // #region agent log
                _dbgLog({ hypothesisId: 'D', location: 'whiteboardSocket.js:save', message: 'save_whiteboard ok', data: { whiteboardId, elementCount: elements?.length ?? 0, redisConfigured: !!redis } });
                // #endregion
            } catch (error) {
                console.error("Error saving whiteboard to DB:", error);
                // #region agent log
                _dbgLog({ hypothesisId: 'D', location: 'whiteboardSocket.js:save', message: 'save_whiteboard error', data: { whiteboardId, error: error.message } });
                // #endregion
            }
        });

        socket.on('leave_whiteboard', (whiteboardId) => {
            socket.leave(`whiteboard:${whiteboardId}`);
            console.log(`[Socket] User ${socket.id} left whiteboard ${whiteboardId}`);
        });
    });
};
