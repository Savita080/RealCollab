// App-level middleware that rewrites slugs in the URL path to canonical ObjectIds
// BEFORE any routing happens.
//
// Why URL rewriting (rather than mutating req.params)?
// Express re-extracts params from the URL at every layer of the routing tree, so
// mutations to req.params don't survive into mounted sub-routers. Rewriting the
// URL itself is the one approach that propagates everywhere — every controller,
// RBAC middleware, and downstream router sees the canonical ObjectId in
// req.params, req.originalUrl, and the URL pattern matcher.
//
// We accept either form forever:
//   /api/workspaces/<slug>/...      → resolved to ObjectId
//   /api/workspaces/<objectId>/...  → passed through untouched
//
// Old bookmarked URLs keep working; pretty URLs are now first-class.

import mongoose from 'mongoose';
import Workspace from '../models/workspace.js';
import Project from '../models/project.js';

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const isObjectId = (s) => OBJECT_ID_RE.test(s) && mongoose.isValidObjectId(s);

// Matches the URL shape that carries a workspace token:
//   /api/workspaces/:wsToken[/projects/:projToken][/...rest]
// Subscription routes are user-scoped now — no workspace token to resolve.
const WS_PATH_RE = /^(\/api\/workspaces\/)([^/?]+)(\/projects\/([^/?]+))?(.*)$/i;

export const resolveSlugUrl = async (req, res, next) => {
    try {
        const m = req.url.match(WS_PATH_RE);
        if (!m) return next();

        // Captures: prefix, wsToken, projSegment?, projToken?, rest
        const prefix = m[1];
        const wsToken = m[2];
        const projSegment = m[3];
        const projToken = m[4];
        const rest = m[5];

        // No-op fast path: both already ObjectIds (or only workspace present + ObjectId).
        if (isObjectId(wsToken) && (!projToken || isObjectId(projToken))) {
            return next();
        }

        // Resolve workspace token → canonical _id
        let wsId = wsToken;
        if (!isObjectId(wsToken)) {
            const ws = await Workspace.findOne({ slug: wsToken.toLowerCase() }).select('_id');
            if (!ws) return res.status(404).json({ message: "Workspace not found." });
            wsId = ws._id.toString();
        }

        // Resolve project token (if present) → canonical _id, scoped to workspace
        let projId = projToken;
        if (projToken && !isObjectId(projToken)) {
            const proj = await Project.findOne({
                workspace: wsId,
                slug: projToken.toLowerCase(),
            }).select('_id');
            if (!proj) return res.status(404).json({ message: "Project not found." });
            projId = proj._id.toString();
        }

        const newPath = projSegment
            ? `${prefix}${wsId}/projects/${projId}${rest}`
            : `${prefix}${wsId}${rest}`;

        req.url = newPath;
        next();
    } catch (err) {
        console.error("Error in resolveSlugUrl middleware:", err.message);
        res.status(500).json({ error: "Internal Server Error in slug resolver" });
    }
};
