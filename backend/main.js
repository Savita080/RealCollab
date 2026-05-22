import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authroutes from './routes/authroutes.js';
import workspaceroutes from './routes/workspaceroutes.js';
import projectroutes from './routes/projectroutes.js';
import taskroutes from './routes/taskroutes.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupKanbanSockets } from './sockets/kanbanSocket.js';

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

//routes
app.use("/api/auth",authroutes);
app.use("/api/workspaces", workspaceroutes);
app.use("/api/workspaces/:workspaceId/projects", projectroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/tasks", taskroutes);

app.get("/", (req, res) => {
    res.json({ message: "RealCollab Backend Is running" });
});

// Activate the Kanban WebSockets!
setupKanbanSockets(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});