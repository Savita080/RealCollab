import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    type: { 
        type: String, 
        enum: ['MENTION', 'PROJECT_ASSIGN', 'ROLE_CHANGE'], 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    link: { 
        type: String 
    },
    // "seen" means they clicked the bell icon and read the list
    seen: { 
        type: Boolean, 
        default: false 
    },
    // "notified" means they successfully received the live Toast popup via WebSockets
    notified: { 
        type: Boolean, 
        default: false 
    }
}, {
    timestamps: true 
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
