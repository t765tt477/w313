import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // Which collection `recipient` points to - lets the same Notification
    // model serve Admins, Drivers and Clients.
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    enum: ['Admin', 'Driver', 'Client'],
    default: 'Admin',
    required: true
  },
  type: {
    type: String,
    enum: [
      'new_order', 'driver_approval', 'driver_credit', 'order_update', 'system',
      // Driver-facing dispatch events
      'order_offer', 'order_reassigned', 'order_offer_expired',
      // Client-facing order lifecycle events
      'order_accepted', 'order_rejected', 'order_picked_up', 'order_delivered', 'order_no_driver',
      // Wallet / balance events
      'recharge_requested', 'recharge_approved', 'recharge_rejected', 'balance_credited', 'low_balance'
    ],
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
  // Whether the client apps should play a notification sound when this arrives
  sound: {
    type: Boolean,
    default: true
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
