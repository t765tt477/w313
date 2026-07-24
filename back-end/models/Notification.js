import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  type: {
    type: String,
    enum: ['new_order', 'driver_approval', 'driver_credit', 'order_update', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    amount: Number,
    status: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Notification', notificationSchema);
