import mongoose from 'mongoose';

// A driver's request to top up their wallet balance. Bank-transfer requests
// are submitted by the driver and reviewed by an admin; cash top-ups are
// created directly by an admin/employee (already approved).
const rechargeRequestSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  method: {
    type: String,
    enum: ['bank', 'cash'],
    default: 'bank'
  },
  // Last 6 digits of the bank transfer operation number (بنكك) - only for
  // method 'bank'.
  transactionLast6: {
    type: String,
    trim: true,
    default: null,
    unique: true,
    sparse: true // Allows multiple null values
  },
  // Amount the driver says they sent, in Sudanese Pounds (SDG)
  amountSent: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // The amount an admin actually credited to the driver's balance after
  // verifying the transfer (may differ from amountSent if needed).
  approvedAmount: {
    type: Number,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  reviewNote: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('RechargeRequest', rechargeRequestSchema);
