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

export const getProjectMembers = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId).populate('members', 'name email avatar');
        if (!project) return res.status(404).json({ message: "Project not found" });
        res.status(200).json({ members: project.members });
    } catch (error) {
        console.error("Error fetching project members:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const addProjectMember = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.body;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        if (project.members.includes(userId)) {
            return res.status(400).json({ message: "User is already a member of this project" });
        }

        project.members.push(userId);
        await project.save();

        res.status(200).json({ message: "Member added to project", members: project.members });
    } catch (error) {
        console.error("Error adding project member:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const removeProjectMember = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        
        const project = await Project.findByIdAndUpdate(
            projectId,
            { $pull: { members: userId } },
            { new: true }
        );

        if (!project) return res.status(404).json({ message: "Project not found" });

        res.status(200).json({ message: "Member removed from project", members: project.members });
    } catch (error) {
        console.error("Error removing project member:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
