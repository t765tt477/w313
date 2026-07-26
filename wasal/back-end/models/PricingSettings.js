import mongoose from 'mongoose';

const pricingSettingsSchema = new mongoose.Schema({
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: true,
    unique: true
  },
  cityName: {
    type: String,
    required: true
  },
  basePricePerKm: {
    type: Number,
    default: 2.00,
    min: 0
  },
  weightFeePerKg: {
    type: Number,
    default: 0.50,
    min: 0
  },
  sizeSmallFee: {
    type: Number,
    default: 0,
    min: 0
  },
  sizeMediumFee: {
    type: Number,
    default: 1,
    min: 0
  },
  sizeLargeFee: {
    type: Number,
    default: 2,
    min: 0
  },
  minDistance: {
    type: Number,
    default: 1,
    min: 0
  },
  maxDistance: {
    type: Number,
    default: 50,
    min: 0
  },
  baseDeliveryFee: {
    type: Number,
    default: 5,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
pricingSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('PricingSettings', pricingSettingsSchema);
