import express from 'express';
import { getAllLogs, getLogById, deleteOldLogs } from '../controllers/logController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All log routes require authentication and admin role
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// Get all logs with filtering
router.get('/', getAllLogs);

// Get single log by ID
router.get('/:id', getLogById);

// Delete old logs (cleanup) - super admin only
router.delete('/cleanup', authorize('super_admin'), deleteOldLogs);

export default router;
