import Workspace from '../models/workspace.js';

// The math logic for our hierarchy!
const ROLE_HIERARCHY = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3
};

export const requireRole = (minRole) => async (req, res, next) => {
    try {
        const workspaceId = req.params.workspaceId;
        
        if (!workspaceId) {
            return res.status(400).json({ message: "Workspace ID is required for role checking." });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found." });
        }

        const member = workspace.members.find(m => m.user.toString() === req.userId);

        if (!member) {
            return res.status(403).json({ message: "You are not a member of this workspace." });
        }

        const userRoleValue = ROLE_HIERARCHY[member.role];
        const minRoleValue = ROLE_HIERARCHY[minRole];

        if (userRoleValue < minRoleValue) {
            return res.status(403).json({ 
                message: `Insufficient permissions. You need to be at least an ${minRole} to do this.` 
            });
        }

        req.workspace = workspace;
        req.memberRole = member.role;
        
        next(); 

    } catch (error) {
        console.error("Error in RBAC middleware:", error.message);
        res.status(500).json({ error: "Internal Server Error in role checking" });
    }
};
