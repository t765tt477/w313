import mongoose from 'mongoose';

// A conversation is either:
//  - type "support": a client or a driver talking to the control panel (any
//    admin can answer - it is not tied to one specific admin).
//  - type "order": a client and the driver assigned to one of their orders,
//    scoped to that order (chat becomes available once a driver accepts).
const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['support', 'order'],
    required: true
  },
  // Only set for type "order".
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'participants.model'
    },
    model: {
      type: String,
      enum: ['Admin', 'Driver', 'Client'],
      required: true
    },
    role: String
  }],
  lastMessage: {
    text: String,
    senderModel: String,
    createdAt: Date
  },
  // Per-participant "last read" timestamps, used to derive unread counts
  // without having to store/maintain a counter per message.
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    lastReadAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
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

conversationSchema.index({ type: 1, 'participants.user': 1 });
conversationSchema.index({ order: 1 });

export default mongoose.model('Conversation', conversationSchema);
