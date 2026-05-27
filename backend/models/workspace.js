import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Workspace name is required'],
        trim: true
    },
    // Lower-cased + trimmed copy of name. Used to enforce per-owner uniqueness
    // (one user can't have two workspaces named "Acme" / "acme  " / "ACME").
    // Always written by controllers via normalizeName(name).
    normalizedName: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    // Top-level owner pointer. Set on create from req.userId, updated on
    // transferOwnership. Drives the (owner, normalizedName) uniqueness index
    // and lets us scope name checks without scanning the members[] array.
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    subscription: {
        plan: {
            type: String,
            enum: ['FREE', 'PRO'],
            default: 'FREE'
        },
        razorpaySubscriptionId: {
            type: String,
            default: null
        },
        currentPeriodEnd: {
            type: Date,
            default: null
        },
        aiRequestsUsed: {
            type: Number,
            default: 0
        },
        aiRequestsResetAt: {
            type: Date,
            default: () => new Date(new Date().setMonth(new Date().getMonth() + 1))
        }
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
            default: 'MEMBER'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    invites: [{
        email: String,
        token: String,
        role: {
            type: String,
            enum: ['ADMIN', 'MEMBER', 'VIEWER'],
            default: 'MEMBER'
        },
        expiresAt: Date
    }]
}, {
    timestamps: true
});

// Per-owner name uniqueness — surfaces as a 409 in createWorkspace/updateWorkspace.
workspaceSchema.index({ owner: 1, normalizedName: 1 }, { unique: true });

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
