// Resolves the :workspaceId URL param so callers can pass either a Mongo
// ObjectId or a slug. After this middleware, downstream handlers see a
// canonical 24-char hex ObjectId in req.params.workspaceId — no other code
// has to know slugs exist.
//
// Why both forms? Pretty URLs (slugs) are the goal, but we don't want to
// break any cached/bookmarked /_id URLs nor coordinate a big-bang frontend
// migration. Resolver accepts both forever.

import mongoose from 'mongoose';
import Workspace from '../models/workspace.js';

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export const resolveWorkspace = async (req, res, next) => {
    try {
        const param = req.params.workspaceId;
        if (!param) return next();

        // Already an ObjectId — fast path, no DB hit needed
        if (mongoose.isValidObjectId(param) && OBJECT_ID_RE.test(param)) {
            return next();
        }

        // Treat as slug — resolve to canonical _id
        const workspace = await Workspace.findOne({ slug: param.toLowerCase() }).select('_id');
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found." });
        }

        req.params.workspaceId = workspace._id.toString();
        next();
    } catch (error) {
        console.error("Error in resolveWorkspace middleware:", error.message);
        res.status(500).json({ error: "Internal Server Error in workspace resolver" });
    }
};
