import express from 'express';
import { login, register } from '../controllers/authcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/register',register);
router.post('/login', login);

router.get('/me', protectRoute, async (req, res) => {
    try {
        // but for a quick test, we will just echo back the ID!
        res.status(200).json({ 
            message: "You made it past the bouncer!", 
            yourId: req.userId 
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});
export default router;  