import express from 'express';
import { login, register, refresh, logout, googleLogin, getProfile, updateProfile } from '../controllers/authcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/google', googleLogin);

router.get('/me', protectRoute, getProfile);
router.patch('/me', protectRoute, updateProfile);

export default router;
