import express from 'express';
import { updateProfile, changePassword } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

export default router;
