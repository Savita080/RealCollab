import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Workspace name is required'],
        trim: true
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
            ref: 'User', // This tells Mongoose this ID links to our User model
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

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
