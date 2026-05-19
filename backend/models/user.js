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
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;
