import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  pickupLocation: {
    address: String,
    lat: Number,
    lng: Number,
    contactName: String,
    contactPhone: String
  },
  deliveryLocation: {
    address: String,
    lat: Number,
    lng: Number,
    contactName: String,
    contactPhone: String
  },
  packageDetails: {
    weight: Number,
    size: String,
    description: String
  },
  distance: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    required: true
  },
  driverEarnings: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending'
  },
  // --- Dispatch / assignment tracking ---
  // Driver the order is currently being OFFERED to (before they accept).
  // This is different from `driver`, which is only set once someone accepts.
  dispatchDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  dispatchStatus: {
    type: String,
    enum: ['searching', 'offered', 'assigned', 'no_drivers_available', 'cancelled'],
    default: 'searching'
  },
  // Drivers who rejected or timed-out on this order, so they are skipped on re-dispatch
  rejectedDrivers: [{
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    reason: { type: String, enum: ['rejected', 'timeout'] },
    at: { type: Date, default: Date.now }
  }],
  // When the current offer to `dispatchDriver` expires (now + 2 minutes)
  dispatchOfferExpiresAt: Date,
  dispatchAttempts: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: Date,
  pickedUpAt: Date,
  deliveredAt: Date
});

export default mongoose.model('Order', orderSchema);
