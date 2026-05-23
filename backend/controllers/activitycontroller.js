import ActivityLog from '../models/activityLog.js';

export const getProjectActivity = async (req, res) => {
    try {
        const { projectId } = req.params;
        const activities = await ActivityLog.find({ project: projectId })
            .populate('user', 'name avatar')
            .sort('-createdAt')
            .limit(50); // Get latest 50 activities to avoid huge payload
            
        res.status(200).json({ activities });
    } catch (error) {
        console.error("Error fetching activity:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// This is a helper function that other controllers can import and call to log an action
export const logActivity = async (projectId, userId, action, targetId, targetName) => {
    try {
        await ActivityLog.create({
            project: projectId,
            user: userId,
            action,
            targetId,
            targetName
        });
    } catch (error) {
        // We just console log this so an activity failure doesn't crash a main request (like creating a task)
        console.error("Error logging activity:", error.message);
    }
};
