import express from 'express';
import dotenv from 'dotenv';
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
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupKanbanSockets } from './sockets/kanbanSocket.js';
import { setupWhiteboardSockets } from './sockets/whiteboardSocket.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allows any frontend to connect for the hackathon
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

dotenv.config();
connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.io to every request so our controllers can use it!
app.use((req, res, next) => {
    req.io = io;
    next();
});

//routes
app.use("/api/auth",authroutes);
app.use("/api/workspaces", workspaceroutes);
app.use("/api/workspaces/:workspaceId/projects", projectroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/tasks", taskroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/snippets", snippetroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/wiki", wikiroutes);
app.use("/api/tasks/:taskId/comments", commentroutes);
app.use("/api/notifications", notificationroutes);
app.use("/api/ai", airoutes);

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