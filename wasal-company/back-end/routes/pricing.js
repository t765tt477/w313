import express from 'express';
import {
  getAllPricingSettings,
  getPricingByCity,
  upsertPricingSettings,
  deletePricingSettings,
  bulkUpdatePricingSettings
} from '../controllers/pricingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public-ish read (used by order pricing calculations); still requires auth
router.get('/', protect, getAllPricingSettings);
router.get('/city/:cityId', protect, getPricingByCity);

// Admin-only management
router.put('/city/:cityId', protect, authorize('admin', 'super_admin'), upsertPricingSettings);
router.delete('/city/:cityId', protect, authorize('admin', 'super_admin'), deletePricingSettings);
router.put('/bulk', protect, authorize('admin', 'super_admin'), bulkUpdatePricingSettings);

export default router;
