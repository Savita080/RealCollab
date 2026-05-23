import Workspace from '../models/workspace.js';
import crypto from 'crypto';


export const createWorkspace = async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Workspace name is required" });
        }

        // 1. Generate a basic slug (convert to lowercase, replace spaces with hyphens)
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        // 2. Create the workspace and assign the current user as the OWNER
        const newWorkspace = await Workspace.create({
            name,
            slug,
            members: [{
                user: req.userId, // We get this from our protectRoute middleware!
                role: 'OWNER'
            }]
        });

        res.status(201).json({
            message: "Workspace created successfully",
            workspace: newWorkspace
        });

    } catch (error) {
        // If the slug is already taken, MongoDB will throw an E11000 duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({ message: "A workspace with a similar name already exists" });
        }
        console.error("Error creating workspace:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getUserWorkspaces = async (req, res) => {
    try {
        // Find all workspaces where the "members" array contains an object with this user's ID
        const workspaces = await Workspace.find({ 
            "members.user": req.userId 
        });

        res.status(200).json({ workspaces });
    } catch (error) {
        console.error("Error fetching workspaces:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



// Update Workspace Name (OWNER ONLY)
export const updateWorkspace = async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Workspace name is required" });
        }

        // Update the name and regenerate the slug
        req.workspace.name = name;
        req.workspace.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        await req.workspace.save();

        res.status(200).json({
            message: "Workspace updated successfully",
            workspace: req.workspace
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "A workspace with a similar name already exists" });
        }
        console.error("Error updating workspace:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Delete Workspace (OWNER ONLY)
export const deleteWorkspace = async (req, res) => {
    try {
        // Because the middleware already fetched the workspace, we just delete it
        await req.workspace.deleteOne();
        
        res.status(200).json({ message: "Workspace deleted successfully" });
    } catch (error) {
        console.error("Error deleting workspace:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 1. Generate an Invite (ADMIN or OWNER only)
export const generateInvite = async (req, res) => {
    try {
        const { email, role } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Generate a random 40-character token
        const token = crypto.randomBytes(20).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 24 hours

        // Add the invite to the workspace array
        req.workspace.invites.push({
            email,
            token,
            role: role || 'MEMBER',
            expiresAt
        });

        await req.workspace.save();

        // For the hackathon, we won't set up actual email sending (like SendGrid).
        // We will just return the link in the API response so you can copy/paste it!
        const inviteLink = `http://localhost:3000/invite/accept/${token}`;

        res.status(200).json({
            message: "Invite generated successfully",
            inviteLink
        });

    } catch (error) {
        console.error("Error generating invite:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 2. Accept an Invite (Logged-in users only)
export const acceptInvite = async (req, res) => {
    try {
        const { token } = req.params;

        // Find a workspace that contains this exact token in its invites array
        const workspace = await Workspace.findOne({ "invites.token": token });

        if (!workspace) {
            return res.status(400).json({ message: "Invalid or expired invite link" });
        }

        // Find the specific invite inside the array
        const inviteIndex = workspace.invites.findIndex(i => i.token === token);
        const invite = workspace.invites[inviteIndex];

        // Check if it expired
        if (new Date() > invite.expiresAt) {
            // Remove the expired invite and save
            workspace.invites.splice(inviteIndex, 1);
            await workspace.save();
            return res.status(400).json({ message: "This invite link has expired" });
        }

        // Check if the user is already a member
        const isAlreadyMember = workspace.members.some(m => m.user.toString() === req.userId);
        if (isAlreadyMember) {
            return res.status(400).json({ message: "You are already a member of this workspace" });
        }

        // Add the user to the workspace members!
        workspace.members.push({
            user: req.userId, // From our protectRoute middleware
            role: invite.role
        });

        // Delete the invite so it can't be used again
        workspace.invites.splice(inviteIndex, 1);
        await workspace.save();

        res.status(200).json({
            message: "Successfully joined the workspace!",
            workspaceId: workspace._id
        });

    } catch (error) {
        console.error("Error accepting invite:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getWorkspaceMembers = async (req, res) => {
    try {
        // req.workspace is already populated with members from the middleware, but we might want full user details
        const workspace = await Workspace.findById(req.workspace._id).populate('members.user', 'name email avatar');
        res.status(200).json({ members: workspace.members });
    } catch (error) {
        console.error("Error fetching members:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateMemberRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        const memberIndex = req.workspace.members.findIndex(m => m.user.toString() === userId);
        if (memberIndex === -1) return res.status(404).json({ message: "Member not found" });

        // Ensure OWNER role can't be freely given/removed unless it's the OWNER doing it, etc.
        // For hackathon, just update it:
        req.workspace.members[memberIndex].role = role;
        await req.workspace.save();

        res.status(200).json({ message: "Role updated successfully", members: req.workspace.members });
    } catch (error) {
        console.error("Error updating role:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Prevent removing the OWNER
        const member = req.workspace.members.find(m => m.user.toString() === userId);
        if (!member) return res.status(404).json({ message: "Member not found" });
        if (member.role === 'OWNER') return res.status(400).json({ message: "Cannot remove the workspace owner" });

        req.workspace.members = req.workspace.members.filter(m => m.user.toString() !== userId);
        await req.workspace.save();

        res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
        console.error("Error removing member:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const transferOwnership = async (req, res) => {
    try {
        const { newOwnerId } = req.body;

        if (!newOwnerId) {
            return res.status(400).json({ message: "newOwnerId is required" });
        }

        // Ensure the new owner exists in the workspace
        const newOwnerIndex = req.workspace.members.findIndex(m => m.user.toString() === newOwnerId);
        if (newOwnerIndex === -1) {
            return res.status(404).json({ message: "The specified user is not a member of this workspace" });
        }

        // Find the current owner (the requester)
        const currentOwnerIndex = req.workspace.members.findIndex(m => m.user.toString() === req.userId);
        
        // Safety check (handled by requireRole middleware, but good to have)
        if (currentOwnerIndex === -1 || req.workspace.members[currentOwnerIndex].role !== 'OWNER') {
            return res.status(403).json({ message: "Only the current owner can transfer ownership" });
        }

        // Transfer the title
        req.workspace.members[currentOwnerIndex].role = 'ADMIN'; // Demote current owner to ADMIN
        req.workspace.members[newOwnerIndex].role = 'OWNER'; // Promote new user to OWNER

        await req.workspace.save();

        res.status(200).json({ 
            message: "Ownership transferred successfully", 
            members: req.workspace.members 
        });

    } catch (error) {
        console.error("Error transferring ownership:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
