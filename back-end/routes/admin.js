import express from 'express';
import {
  getAllDrivers,
  addDriverCredit,
  getDriverDetails,
  getAllOrders,
  getAllClients,
  getAnalytics,
  approveDriver,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  toggleAdminSuspension
} from '../controllers/adminController.js';
import { protect, authorize, authorizeSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Driver routes (admin and super_admin)
router.get('/drivers', protect, authorize('admin', 'super_admin'), getAllDrivers);
router.post('/drivers/credit', protect, authorize('admin', 'super_admin'), addDriverCredit);
router.get('/drivers/:id', protect, authorize('admin', 'super_admin'), getDriverDetails);
router.put('/drivers/:id/approve', protect, authorize('admin', 'super_admin'), approveDriver);

// Order routes (admin and super_admin)
router.get('/orders', protect, authorize('admin', 'super_admin'), getAllOrders);

// Client routes (admin and super_admin)
router.get('/clients', protect, authorize('admin', 'super_admin'), getAllClients);

// Analytics routes (admin and super_admin)
router.get('/analytics', protect, authorize('admin', 'super_admin'), getAnalytics);

// Admin management routes (super_admin only)
router.get('/admins', protect, authorizeSuperAdmin, getAllAdmins);
router.post('/admins', protect, authorizeSuperAdmin, createAdmin);
router.put('/admins/:id', protect, authorizeSuperAdmin, updateAdmin);
router.delete('/admins/:id', protect, authorizeSuperAdmin, deleteAdmin);
router.put('/admins/:id/suspend', protect, authorizeSuperAdmin, toggleAdminSuspension);

export default router;
