import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authroutes from './routes/authroutes.js';
import workspaceroutes from './routes/workspaceroutes.js';
import projectroutes from './routes/projectroutes.js';
import taskroutes from './routes/taskroutes.js';
const app = express();

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});