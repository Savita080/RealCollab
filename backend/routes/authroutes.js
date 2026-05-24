import express from 'express';
import { login, register, googleLogin, getProfile, updateProfile } from '../controllers/authcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);

router.get('/me', protectRoute, getProfile);
router.patch('/me', protectRoute, updateProfile);

export default router;
