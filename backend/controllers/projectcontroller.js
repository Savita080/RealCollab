import Project from '../models/project.js';
import Workspace from '../models/workspace.js';
import User from '../models/user.js';
import { notifyUser } from '../utils/notify.js';

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
            description,
            members: [{
                user: req.userId,
                role: 'CONTRIBUTOR'
            }]
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
        const userId = req.userId;

        // OWNER/ADMIN see all projects; MEMBER/VIEWER only see projects they're in
        const workspace = await Workspace.findById(workspaceId);
        const wsMember = workspace?.members.find(m => m.user.toString() === userId.toString());
        const role = wsMember?.role || 'VIEWER';

        let projects;
        if (role === 'OWNER' || role === 'ADMIN') {
            projects = await Project.find({ workspace: workspaceId });
        } else {
            projects = await Project.find({
                workspace: workspaceId,
                'members.user': userId
            });
        }

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
        const project = await Project.findById(projectId).populate('members.user', 'name email avatar');
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
        const { userId, role } = req.body;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Check if user is already a member (subdocument comparison)
        const alreadyMember = project.members.some(m => m.user.toString() === userId);
        if (alreadyMember) {
            return res.status(400).json({ message: "User is already a member of this project" });
        }

        project.members.push({
            user: userId,
            role: role || 'VIEWER'
        });
        await project.save();

        // Notify the newly added user
        const sender = await User.findById(req.userId).select('name');
        const senderName = sender?.name || 'Someone';
        notifyUser(req.io, {
            recipient: userId,
            sender: req.userId,
            type: 'PROJECT_ASSIGN',
            content: `${senderName} added you to "${project.name}" as ${role || 'VIEWER'}`,
            link: `/workspaces/${req.params.workspaceId}/projects/${req.params.projectId}`,
        }).catch(err => console.error('[project-add notify] failed:', err.message));

        res.status(200).json({ message: "Member added to project", members: project.members });
    } catch (error) {
        console.error("Error adding project member:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const removeProjectMember = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const memberExists = project.members.some(m => m.user.toString() === userId);
        if (!memberExists) return res.status(404).json({ message: "Member not found in this project" });

        project.members = project.members.filter(m => m.user.toString() !== userId);
        await project.save();

        res.status(200).json({ message: "Member removed from project", members: project.members });
    } catch (error) {
        console.error("Error removing project member:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
