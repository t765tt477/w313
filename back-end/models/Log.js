import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'login', 'logout'],
    required: true
  },
  entity: {
    type: String,
    enum: ['driver', 'order', 'client', 'admin'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  details: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
logSchema.index({ createdAt: -1 });
logSchema.index({ action: 1 });
logSchema.index({ entity: 1 });
logSchema.index({ user: 1 });

export default mongoose.model('Log', logSchema);
