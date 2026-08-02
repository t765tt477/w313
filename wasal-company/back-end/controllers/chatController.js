import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import { emitToUser, emitToRole, emitToRoom } from '../services/socketService.js';

// ---- Helpers -------------------------------------------------------------

// Figures out which model + "role" an authenticated user acts as, following
// the same convention already used across the app (Client documents have no
// `role` field and default to 'client').
export const getActorInfo = (user) => {
  if (user.role === 'admin' || user.role === 'super_admin') {
    return { model: 'Admin', role: user.role };
  }
  if (user.role === 'driver') {
    return { model: 'Driver', role: 'driver' };
  }
  return { model: 'Client', role: 'client' };
};

const isAdminActor = (actor) => actor.model === 'Admin';

const isParticipant = (conversation, userId) =>
  conversation.participants.some((p) => p.user.toString() === userId.toString());

// Admins (the control panel) can see/act on every conversation so they can
// oversee support requests and mediate order chats; everyone else must be a
// participant.
const canAccess = (conversation, user, actor) =>
  isAdminActor(actor) || isParticipant(conversation, user._id);

const populateParticipants = (query) => query.populate('participants.user', 'name email role vehicleType');

// ---- Shared message-creation logic (used by REST + sockets) -------------

export const createMessage = async ({ conversationId, sender, actor, text }) => {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw Object.assign(new Error('لا يمكن إرسال رسالة فارغة'), { status: 400 });
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw Object.assign(new Error('المحادثة غير موجودة'), { status: 404 });
  }
  if (!canAccess(conversation, sender, actor)) {
    throw Object.assign(new Error('غير مصرح لك بالوصول لهذه المحادثة'), { status: 403 });
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: sender._id,
    senderModel: actor.model,
    senderName: sender.name,
    text: trimmed
  });

  conversation.lastMessage = { text: trimmed, senderModel: actor.model, createdAt: message.createdAt };
  conversation.updatedAt = new Date();
  // Sending a message counts as having read the conversation yourself.
  const existingRead = conversation.readBy.find((r) => r.user.toString() === sender._id.toString());
  if (existingRead) existingRead.lastReadAt = message.createdAt;
  else conversation.readBy.push({ user: sender._id, lastReadAt: message.createdAt });
  await conversation.save();

  const payload = {
    _id: message._id,
    conversation: conversation._id.toString(),
    sender: sender._id,
    senderModel: actor.model,
    senderName: sender.name,
    text: trimmed,
    createdAt: message.createdAt
  };

  // Live update to anyone already viewing this thread.
  emitToRoom(`chat:${conversation._id}`, 'chat:message', payload);

  // Also nudge every participant who isn't the sender (for badges/notifications
  // in their conversation list, even if they don't currently have the thread open).
  conversation.participants.forEach((p) => {
    if (p.user.toString() !== sender._id.toString()) {
      emitToUser(p.user, 'chat:new_message', { conversationId: conversation._id.toString(), ...payload });
    }
  });
  // For support conversations, let any online admin know a new message came in,
  // even before they've opened the inbox.
  if (conversation.type === 'support' && !isAdminActor(actor)) {
    emitToRole('admin', 'chat:new_message', { conversationId: conversation._id.toString(), ...payload });
    emitToRole('super_admin', 'chat:new_message', { conversationId: conversation._id.toString(), ...payload });
  }

  return { conversation, message: payload };
};

export const canJoinConversation = async (conversationId, user, actor) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return false;
  return canAccess(conversation, user, actor);
};

// ---- REST handlers --------------------------------------------------------

// GET /api/chats - list my conversations (admins see everything)
export const getConversations = async (req, res) => {
  try {
    const actor = getActorInfo(req.user);
    const filter = isAdminActor(actor) ? {} : { 'participants.user': req.user._id };
    if (req.query.type) filter.type = req.query.type;

    const conversations = await populateParticipants(
      Conversation.find(filter).sort({ updatedAt: -1 }).limit(200)
    );

    const result = conversations.map((c) => {
      const myRead = c.readBy.find((r) => r.user.toString() === req.user._id.toString());
      const unread = !!c.lastMessage?.createdAt &&
        c.lastMessage.senderModel !== (isAdminActor(actor) ? 'Admin' : actor.model) &&
        (!myRead || myRead.lastReadAt < c.lastMessage.createdAt);
      return {
        _id: c._id,
        type: c.type,
        order: c.order,
        participants: c.participants,
        lastMessage: c.lastMessage,
        status: c.status,
        updatedAt: c.updatedAt,
        unread
      };
    });

    res.status(200).json({ conversations: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/chats/support - get or create my support conversation with the control panel
export const getOrCreateSupportConversation = async (req, res) => {
  try {
    const actor = getActorInfo(req.user);
    if (isAdminActor(actor)) {
      return res.status(400).json({ message: 'حسابات الإدارة لا تملك محادثة دعم خاصة بها' });
    }

    let conversation = await Conversation.findOne({
      type: 'support',
      'participants.user': req.user._id
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'support',
        participants: [{ user: req.user._id, model: actor.model, role: actor.role }]
      });
    }

    conversation = await populateParticipants(Conversation.findById(conversation._id));
    res.status(200).json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/chats/order/:orderId - get or create the client<->driver chat for an order
export const getOrCreateOrderConversation = async (req, res) => {
  try {
    const actor = getActorInfo(req.user);
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    if (!order.driver) {
      return res.status(400).json({ message: 'المحادثة تتاح بعد قبول مندوب للطلب' });
    }

    const isOrderClient = order.client.toString() === req.user._id.toString();
    const isOrderDriver = order.driver.toString() === req.user._id.toString();
    if (!isOrderClient && !isOrderDriver && !isAdminActor(actor)) {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول لمحادثة هذا الطلب' });
    }

    let conversation = await Conversation.findOne({ type: 'order', order: order._id });
    if (!conversation) {
      conversation = await Conversation.create({
        type: 'order',
        order: order._id,
        participants: [
          { user: order.client, model: 'Client', role: 'client' },
          { user: order.driver, model: 'Driver', role: 'driver' }
        ]
      });
    }

    conversation = await populateParticipants(Conversation.findById(conversation._id));
    res.status(200).json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/chats/admin/:userId - get or create a support conversation with a specific user (admin only)
export const getOrCreateConversationWithUser = async (req, res) => {
  try {
    const actor = getActorInfo(req.user);
    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: 'غير مصرح لك بهذا الإجراء' });
    }

    const { userId } = req.params;
    const { model } = req.body; // 'Client' or 'Driver'

    if (!model || !['Client', 'Driver'].includes(model)) {
      return res.status(400).json({ message: 'نوع المستخدم غير صالح' });
    }

    // Import models dynamically to avoid circular dependencies
    const UserModel = model === 'Client' ? (await import('../models/Client.js')).default : (await import('../models/Driver.js')).default;
    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    let conversation = await Conversation.findOne({
      type: 'support',
      'participants.user': userId
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'support',
        participants: [
          { user: userId, model, role: model === 'Client' ? 'client' : 'driver' }
        ]
      });
    }

    conversation = await populateParticipants(Conversation.findById(conversation._id));
    res.status(200).json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/chats/:id/messages
export const getMessages = async (req, res) => {
  try {
    const actor = getActorInfo(req.user);
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة' });
    if (!canAccess(conversation, req.user, actor)) {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول لهذه المحادثة' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const before = req.query.before ? new Date(req.query.before) : null;
    const filter = { conversation: conversation._id };
    if (before) filter.createdAt = { $lt: before };

    const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(limit);
    messages.reverse();

    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/chats/:id/messages
export const sendMessage = async (req, res) => {
  try {
    const actor = getActorInfo(req.user);
    const { message } = await createMessage({
      conversationId: req.params.id,
      sender: req.user,
      actor,
      text: req.body.text
    });
    res.status(201).json({ message });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

// PUT /api/chats/:id/read
export const markConversationRead = async (req, res) => {
  try {
    const actor = getActorInfo(req.user);
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة' });
    if (!canAccess(conversation, req.user, actor)) {
      return res.status(403).json({ message: 'غير مصرح لك بالوصول لهذه المحادثة' });
    }

    const existing = conversation.readBy.find((r) => r.user.toString() === req.user._id.toString());
    if (existing) existing.lastReadAt = new Date();
    else conversation.readBy.push({ user: req.user._id, lastReadAt: new Date() });
    await conversation.save();

    res.status(200).json({ message: 'تم التحديث' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
