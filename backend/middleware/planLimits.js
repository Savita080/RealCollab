import Task from '../models/task.js';
import WikiPage from '../models/wikiPage.js';
import Whiteboard from '../models/whiteboard.js';
import CodeSnippet from '../models/codeSnippet.js';
import Workspace from '../models/workspace.js';
import User from '../models/user.js';

const PLAN_LIMITS = {
    tasks: { FREE: 50, PRO: Infinity },
    wikiPages: { FREE: 10, PRO: Infinity },
    whiteboards: { FREE: 2, PRO: Infinity },
    snippets: { FREE: 20, PRO: Infinity },
    members: { FREE: 4, PRO: 50 },
    projects: { FREE: 3, PRO: Infinity },
    workspaces: { FREE: 2, PRO: Infinity },
    aiRequests: { FREE: 10, PRO: 200 }
};

const MODEL_MAP = {
    tasks: { model: Task, query: (projectId) => ({ project: projectId }) },
    wikiPages: { model: WikiPage, query: (projectId) => ({ project: projectId }) },
    whiteboards: { model: Whiteboard, query: (projectId) => ({ project: projectId }) },
    snippets: { model: CodeSnippet, query: (projectId) => ({ project: projectId }) }
};

// Resolve the plan that governs an action. The plan now lives on the User who
// OWNS the workspace, not on the workspace itself. We look up the workspace's
// owner and read their plan. Falls back to FREE if anything is missing.
async function getPlanForWorkspace(workspace) {
    if (!workspace?.owner) return 'FREE';
    const owner = await User.findById(workspace.owner).select('subscription').lean();
    return owner?.subscription?.plan || 'FREE';
}

export const checkLimit = (resourceType) => async (req, res, next) => {
    try {
        const workspace = req.workspace;
        if (!workspace) {
            return res.status(400).json({ message: "Workspace context required" });
        }

        const plan = await getPlanForWorkspace(workspace);
        const limit = PLAN_LIMITS[resourceType]?.[plan];
        if (limit === undefined) return res.status(500).json({ error: "Invalid resource type" });
        if (limit === Infinity) return next();

        let currentCount = 0;
        if (resourceType === 'projects') {
            const Project = (await import('../models/project.js')).default;
            currentCount = await Project.countDocuments({ workspace: workspace._id });
        } else if (resourceType === 'members') {
            // Existing members + outstanding invites — both count toward the cap.
            const invites = (workspace.invites || []).filter(i => !i.expiresAt || i.expiresAt > new Date()).length;
            currentCount = workspace.members.length + invites;
        } else if (MODEL_MAP[resourceType]) {
            const { model, query } = MODEL_MAP[resourceType];
            const projectId = req.params.projectId || req.project?._id;
            if (!projectId) return res.status(400).json({ message: "Project context required" });
            currentCount = await model.countDocuments(query(projectId));
        } else {
            return res.status(500).json({ error: "Unknown resource type" });
        }

        if (currentCount >= limit) {
            return res.status(403).json({
                error: "Plan limit reached",
                resourceType,
                current: currentCount,
                limit,
                plan,
                message: `Your ${plan} plan allows up to ${limit} ${resourceType}. Upgrade to Pro for unlimited access.`,
                upgradeUrl: `/subscribe`
            });
        }

        next();
    } catch (error) {
        console.error(`Error checking ${resourceType} limit:`, error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Cap on workspaces a user can OWN. Unlike the old version this is unambiguous:
// the user's plan governs the cap, not some random owned workspace's plan.
export const checkWorkspaceLimit = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select('subscription').lean();
        const plan = user?.subscription?.plan || 'FREE';
        const limit = PLAN_LIMITS.workspaces[plan];
        if (limit === Infinity) return next();

        const ownedCount = await Workspace.countDocuments({
            members: { $elemMatch: { user: req.userId, role: 'OWNER' } }
        });

        if (ownedCount >= limit) {
            return res.status(403).json({
                error: "Plan limit reached",
                resourceType: 'workspaces',
                current: ownedCount,
                limit,
                plan,
                message: `Your ${plan} plan allows ${limit} workspace${limit === 1 ? '' : 's'}. Upgrade to Pro for unlimited workspaces.`,
                upgradeUrl: `/subscribe`
            });
        }

        next();
    } catch (error) {
        console.error("Error checking workspace limit:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Per-user monthly AI quota. Counter and reset date live on the User.
export const checkAIQuota = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(401).json({ message: "User not found" });

        const plan = user.subscription?.plan || 'FREE';
        const limit = PLAN_LIMITS.aiRequests[plan];

        const now = new Date();
        if (!user.subscription.aiRequestsResetAt || user.subscription.aiRequestsResetAt < now) {
            user.subscription.aiRequestsUsed = 0;
            const nextReset = new Date(now);
            nextReset.setMonth(nextReset.getMonth() + 1);
            user.subscription.aiRequestsResetAt = nextReset;
        }

        if (user.subscription.aiRequestsUsed >= limit) {
            await user.save();
            return res.status(403).json({
                error: "AI quota exceeded",
                resourceType: 'aiRequests',
                current: user.subscription.aiRequestsUsed,
                limit,
                plan,
                message: `Your ${plan} plan allows ${limit} AI requests per month. Upgrade to Pro for 200 requests/month.`,
                upgradeUrl: `/subscribe`
            });
        }

        user.subscription.aiRequestsUsed += 1;
        await user.save();
        next();
    } catch (error) {
        console.error("Error checking AI quota:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Exposed for the subscription status endpoint to report current limits.
export { PLAN_LIMITS };
