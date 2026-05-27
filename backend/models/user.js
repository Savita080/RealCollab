import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    avatar: {
        type: String,
        default: 'https://api.dicebear.com/7.x/bottts/svg'
    },
    bio: {
        type: String,
        default: ''
    },
    githubUrl: {
        type: String,
        default: ''
    },
    skills: [{
        type: String,
        trim: true
    }],
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken: {
        type: String,
        default: null
    },
    // Web Push subscriptions — one entry per browser/device
    pushSubscriptions: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    // Per-user subscription. Applies to every workspace the user owns.
    subscription: {
        plan: {
            type: String,
            enum: ['FREE', 'PRO'],
            default: 'FREE'
        },
        razorpayPaymentId: {
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
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;
