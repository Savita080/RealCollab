import Task from '../models/task.js';
import WikiPage from '../models/wikiPage.js';
import Whiteboard from '../models/whiteboard.js';
import CodeSnippet from '../models/codeSnippet.js';
import Workspace from '../models/workspace.js';

const PLAN_LIMITS = {
    tasks: { FREE: 50, PRO: Infinity },
    wikiPages: { FREE: 10, PRO: Infinity },
    whiteboards: { FREE: 2, PRO: Infinity },
    snippets: { FREE: 20, PRO: Infinity },
    members: { FREE: 5, PRO: 50 },
    projects: { FREE: 3, PRO: Infinity },
    workspaces: { FREE: 1, PRO: Infinity },
    aiRequests: { FREE: 10, PRO: 200 }
};

const MODEL_MAP = {
    tasks: { model: Task, query: (projectId) => ({ project: projectId }) },
    wikiPages: { model: WikiPage, query: (projectId) => ({ project: projectId }) },
    whiteboards: { model: Whiteboard, query: (projectId) => ({ project: projectId }) },
    snippets: { model: CodeSnippet, query: (projectId) => ({ project: projectId }) }
};

export const checkLimit = (resourceType) => async (req, res, next) => {
    try {
        const workspace = req.workspace;

        if (!workspace) {
            return res.status(400).json({ message: "Workspace context required" });
        }

        const plan = workspace.subscription?.plan || 'FREE';
        const limit = PLAN_LIMITS[resourceType]?.[plan];

        if (limit === undefined) {
            return res.status(500).json({ error: "Invalid resource type" });
        }

        if (limit === Infinity) {
            return next();
        }

        let currentCount = 0;

        if (resourceType === 'projects') {
            const Project = (await import('../models/project.js')).default;
            currentCount = await Project.countDocuments({ workspace: workspace._id });
        } else if (resourceType === 'members') {
            currentCount = workspace.members.length;
        } else if (MODEL_MAP[resourceType]) {
            const { model, query } = MODEL_MAP[resourceType];
            const projectId = req.params.projectId || req.project?._id;
            if (!projectId) {
                return res.status(400).json({ message: "Project context required" });
            }
            currentCount = await model.countDocuments(query(projectId));
        } else {
            return res.status(500).json({ error: "Unknown resource type" });
        }

        if (currentCount >= limit) {
            return res.status(403).json({
                error: "Plan limit reached",
                message: `Your ${plan} plan allows up to ${limit} ${resourceType}. Upgrade to Pro for unlimited access.`,
                upgradeUrl: `/workspaces/${workspace._id}/subscribe`
            });
        }

        next();
    } catch (error) {
        console.error(`Error checking ${resourceType} limit:`, error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const checkWorkspaceLimit = async (req, res, next) => {
    try {
        const ownedCount = await Workspace.countDocuments({
            members: { $elemMatch: { user: req.userId, role: 'OWNER' } }
        });

        // Free tier: check against limit. Pro users have no owned workspace to check against here
        // so we use a simple heuristic — if they own >=1 workspace, look at that workspace's plan.
        // For new users (0 workspaces), always allow creation.
        if (ownedCount === 0) return next();

        // Find one of their owned workspaces to determine their plan
        const ownedWorkspace = await Workspace.findOne({
            members: { $elemMatch: { user: req.userId, role: 'OWNER' } }
        });

        const plan = ownedWorkspace?.subscription?.plan || 'FREE';
        const limit = PLAN_LIMITS.workspaces[plan];

        if (limit !== Infinity && ownedCount >= limit) {
            return res.status(403).json({
                error: "Plan limit reached",
                message: `Your ${plan} plan allows ${limit} workspace. Upgrade to Pro for unlimited workspaces.`,
            });
        }

        next();
    } catch (error) {
        console.error("Error checking workspace limit:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const checkAIQuota = async (req, res, next) => {
    try {
        const workspace = req.workspace;

        if (!workspace) {
            return res.status(400).json({ message: "Workspace context required" });
        }

        const plan = workspace.subscription?.plan || 'FREE';
        const limit = PLAN_LIMITS.aiRequests[plan];

        const now = new Date();
        if (!workspace.subscription.aiRequestsResetAt || workspace.subscription.aiRequestsResetAt < now) {
            workspace.subscription.aiRequestsUsed = 0;
            const nextReset = new Date(now);
            nextReset.setMonth(nextReset.getMonth() + 1);
            workspace.subscription.aiRequestsResetAt = nextReset;
            await workspace.save();
        }

        if (workspace.subscription.aiRequestsUsed >= limit) {
            return res.status(403).json({
                error: "AI quota exceeded",
                message: `Your ${plan} plan allows ${limit} AI requests per month. Upgrade to Pro for 200 requests/month.`,
                upgradeUrl: `/workspaces/${workspace._id}/subscribe`
            });
        }

        workspace.subscription.aiRequestsUsed += 1;
        await workspace.save();

        next();
    } catch (error) {
        console.error("Error checking AI quota:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
