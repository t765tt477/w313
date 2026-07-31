import mongoose from 'mongoose';

// Full audit trail of every change to a driver's wallet balance: recharges
// (bank or cash) and per-delivery commission deductions. Every entry keeps
// a clear timestamp plus the balance before/after so the history shown in
// the driver page and the control panel is always accurate.
const balanceTransactionSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  type: {
    type: String,
    enum: ['recharge_bank', 'recharge_cash', 'commission_deduction', 'adjustment'],
    required: true
  },
  // Positive for recharges, negative for commission deductions/adjustments
  amount: {
    type: Number,
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  rechargeRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RechargeRequest',
    default: null
  },
  // Admin/employee who performed or approved this transaction (null for
  // automatic system deductions)
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  note: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

balanceTransactionSchema.index({ driver: 1, createdAt: -1 });

export default mongoose.model('BalanceTransaction', balanceTransactionSchema);
