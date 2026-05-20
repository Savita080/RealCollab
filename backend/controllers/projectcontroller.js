import Project from '../models/project.js';

export const createProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        const workspaceId = req.params.workspaceId;

        if (!name) {
            return res.status(400).json({ message: "Project name is required" });
        }

        const newProject = await Project.create({
            workspace: workspaceId,
            name,
            description
        });

        res.status(201).json({
            message: "Project created successfully",
            project: newProject
        });
    } catch (error) {
        console.error("Error creating project:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getWorkspaceProjects = async (req, res) => {
    try {
        const workspaceId = req.params.workspaceId;
        const projects = await Project.find({ workspace: workspaceId });
        res.status(200).json({ projects });
    } catch (error) {
        console.error("Error fetching projects:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description } = req.body;

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { name, description },
            { new: true }
        );

        if (!updatedProject) {
            return res.status(404).json({ message: "Project not found" });
        }

        res.status(200).json({
            message: "Project updated successfully",
            project: updatedProject
        });
    } catch (error) {
        console.error("Error updating project:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const deletedProject = await Project.findByIdAndDelete(projectId);

        if (!deletedProject) {
            return res.status(404).json({ message: "Project not found" });
        }

        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        console.error("Error deleting project:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
