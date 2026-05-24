import Project from '../models/project.js';
import Workspace from '../models/workspace.js';

export const injectWorkspaceFromProject = async (req, res, next) => {
    try {
        if (req.workspace) {
            return next();
        }

        const projectId = req.body.projectId || req.params.projectId;
        const workspaceId = req.body.workspaceId || req.params.workspaceId;

        if (workspaceId) {
            const workspace = await Workspace.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ message: "Workspace not found" });
            }
            req.workspace = workspace;
            return next();
        }

        if (projectId) {
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: "Project not found" });
            }
            const workspace = await Workspace.findById(project.workspace);
            if (!workspace) {
                return res.status(404).json({ message: "Workspace not found" });
            }
            req.workspace = workspace;
            return next();
        }

        return res.status(400).json({ message: "Project ID or Workspace ID required for quota check" });
    } catch (error) {
        console.error("Error injecting workspace:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
