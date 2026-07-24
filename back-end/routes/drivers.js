import express from 'express';
import {
  getDriverProfile,
  updateDriverProfile,
  updateLocation,
  toggleAvailability,
  getAvailableOrders,
  acceptOrder,
  updateOrderStatus,
  getDriverOrders,
  getEarnings
} from '../controllers/driverController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', protect, authorize('driver'), getDriverProfile);
router.put('/profile', protect, authorize('driver'), updateDriverProfile);
router.put('/location', protect, authorize('driver'), updateLocation);
router.put('/availability', protect, authorize('driver'), toggleAvailability);
router.get('/available-orders', protect, authorize('driver'), getAvailableOrders);
router.post('/accept-order', protect, authorize('driver'), acceptOrder);
router.put('/order-status', protect, authorize('driver'), updateOrderStatus);
router.get('/orders', protect, authorize('driver'), getDriverOrders);
router.get('/earnings', protect, authorize('driver'), getEarnings);

export default router;
