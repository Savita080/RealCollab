import Workspace from '../models/workspace.js';

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

// Next, we'll write a function to fetch all workspaces a user belongs to!
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
