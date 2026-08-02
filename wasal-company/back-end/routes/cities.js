import express from 'express';
import {
  getActiveCities,
  getAllCities,
  createCity,
  updateCity,
  deleteCity
} from '../controllers/cityController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public - used by client/driver registration forms
router.get('/active', getActiveCities);

// Admin management
router.get('/', protect, authorize('admin', 'super_admin'), getAllCities);
router.post('/', protect, authorize('admin', 'super_admin'), createCity);
router.put('/:id', protect, authorize('admin', 'super_admin'), updateCity);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteCity);

export default router;
