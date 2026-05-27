import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
import connectDB from './config/db.js';
import redis from './config/redis.js'; // Import Redis so it connects!
import authroutes from './routes/authroutes.js';
import workspaceroutes from './routes/workspaceroutes.js';
import projectroutes from './routes/projectroutes.js';
import taskroutes from './routes/taskroutes.js';
import notificationroutes from './routes/notificationroutes.js';
import commentroutes from './routes/commentroutes.js';
import snippetroutes from './routes/snippetroutes.js';
import airoutes from './routes/airoutes.js';
import wikiroutes from './routes/wikiroutes.js';
import chatroutes from './routes/chatroutes.js';
import whiteboardroutes from './routes/whiteboardroutes.js';
import activityroutes from './routes/activityroutes.js';
import workspaceactivityroutes from './routes/workspaceactivityroutes.js';
import subscriptionroutes from './routes/subscriptionroutes.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupKanbanSockets } from './sockets/kanbanSocket.js';
import { setupWhiteboardSockets } from './sockets/whiteboardSocket.js';
import { resolveSlugUrl } from './middleware/resolveSlugUrl.js';
const app = express();
const httpServer = createServer(app);
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ["http://localhost:5173"];

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.io to every request so our controllers can use it!
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rewrite slugs in the URL to canonical ObjectIds before routing kicks in.
// Runs once at the app level — every downstream layer sees ObjectIds, so no
// router/controller/model has to know slugs exist.
app.use(resolveSlugUrl);

//routes
app.use("/api/auth", authroutes);
app.use("/api/workspaces", workspaceroutes);
app.use("/api/workspaces/:workspaceId/activity", workspaceactivityroutes);
app.use("/api/workspaces/:workspaceId/projects", projectroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/tasks", taskroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/snippets", snippetroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/wiki", wikiroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/chat", chatroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/whiteboards", whiteboardroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/activity", activityroutes);
app.use("/api/tasks/:taskId/comments", commentroutes);
app.use("/api/notifications", notificationroutes);
app.use("/api/ai", airoutes);
app.use("/api/subscriptions", subscriptionroutes);

app.get("/", (req, res) => {
    res.json({ message: "RealCollab Backend Is running" });
});

// Activate the WebSockets!
setupKanbanSockets(io);
setupWhiteboardSockets(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});