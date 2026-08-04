import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Driver from '../models/Driver.js';
import Client from '../models/Client.js';

let io = null;

// Every connected socket joins a room named `user:<id>` so we can push
// events to a specific person regardless of how many tabs/devices they
// have open, and a room named `role:<role>` for broadcast-style events
// (e.g. "new order" -> all online admins).
const userRoom = (userId) => `user:${userId}`;
const roleRoom = (role) => `role:${role}`;

async function resolveUserFromToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  let user = await Admin.findById(decoded.id);
  if (user) return { id: user._id.toString(), role: user.role || 'admin' };

  user = await Driver.findById(decoded.id);
  if (user) return { id: user._id.toString(), role: 'driver' };

  user = await Client.findById(decoded.id);
  if (user) return { id: user._id.toString(), role: 'client' };

  return null;
}

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      credentials: true
    },
    // Render-specific WebSocket configuration
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6, // 1MB
    // Better error handling for Render
    connectTimeout: 45000,
    // Handle Render's load balancer
    path: '/socket.io/'
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));

      const identity = await resolveUserFromToken(token);
      if (!identity) return next(new Error('User not found'));

      socket.userId = identity.id;
      socket.role = identity.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.userId));
    socket.join(roleRoom(socket.role));

    // Drivers can push their live GPS position over the socket (cheaper than
    // a REST call every few seconds) while an order is in progress.
    socket.on('driver:location', async (payload) => {
      if (socket.role !== 'driver') return;
      try {
        const { default: dispatchService } = await import('./dispatchService.js');
        await dispatchService.handleDriverLocationPing(socket.userId, payload);
      } catch (err) {
        console.error('driver:location handling error:', err.message);
      }
    });

    // --- Internal chat (client <-> driver, client/driver <-> control panel) ---

    // Join a conversation's room so this socket receives 'chat:message' events
    // for it live. Access is re-checked server-side (participant, or admin).
    socket.on('chat:join', async (payload, ack) => {
      try {
        const conversationId = typeof payload === 'string' ? payload : payload?.conversationId;
        const { canJoinConversation, getActorInfo } = await import('../controllers/chatController.js');
        const Admin = (await import('../models/Admin.js')).default;
        const Driver = (await import('../models/Driver.js')).default;
        const Client = (await import('../models/Client.js')).default;
        const Model = socket.role === 'driver' ? Driver : (socket.role === 'client' ? Client : Admin);
        const user = await Model.findById(socket.userId);
        if (!user) return ack?.({ ok: false, message: 'User not found' });

        const actor = getActorInfo(user);
        const allowed = await canJoinConversation(conversationId, user, actor);
        if (!allowed) return ack?.({ ok: false, message: 'Not authorized for this conversation' });

        socket.join(`chat:${conversationId}`);
        ack?.({ ok: true });
      } catch (err) {
        console.error('chat:join error:', err.message);
        ack?.({ ok: false, message: 'Server error' });
      }
    });

    socket.on('chat:leave', (payload) => {
      const conversationId = typeof payload === 'string' ? payload : payload?.conversationId;
      if (conversationId) socket.leave(`chat:${conversationId}`);
    });

    // Send a chat message over the socket (used instead of the REST endpoint
    // for lower latency while a thread is open).
    socket.on('chat:message', async (payload, ack) => {
      try {
        const { conversationId, text } = payload || {};
        const { createMessage, getActorInfo } = await import('../controllers/chatController.js');
        const Admin = (await import('../models/Admin.js')).default;
        const Driver = (await import('../models/Driver.js')).default;
        const Client = (await import('../models/Client.js')).default;
        const Model = socket.role === 'driver' ? Driver : (socket.role === 'client' ? Client : Admin);
        const user = await Model.findById(socket.userId);
        if (!user) return ack?.({ ok: false, message: 'User not found' });

        const actor = getActorInfo(user);
        const { message } = await createMessage({ conversationId, sender: user, actor, text });
        ack?.({ ok: true, message });
      } catch (err) {
        console.error('chat:message error:', err.message);
        ack?.({ ok: false, message: err.message || 'Server error' });
      }
    });

    // Lightweight typing indicator, relayed to everyone else in the room.
    socket.on('chat:typing', (payload) => {
      const conversationId = typeof payload === 'string' ? payload : payload?.conversationId;
      if (!conversationId) return;
      socket.to(`chat:${conversationId}`).emit('chat:typing', {
        conversationId,
        userId: socket.userId,
        isTyping: !!payload?.isTyping
      });
    });

    socket.on('disconnect', () => {
      // Rooms are cleaned up automatically by socket.io on disconnect.
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

export const getIO = () => io;

export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userRoom(userId.toString())).emit(event, payload);
};

export const emitToRole = (role, event, payload) => {
  if (!io) return;
  io.to(roleRoom(role)).emit(event, payload);
};

// Generic room emit, used by the chat feature (`chat:<conversationId>`).
export const emitToRoom = (room, event, payload) => {
  if (!io || !room) return;
  io.to(room).emit(event, payload);
};

export default { initSocket, getIO, emitToUser, emitToRole, emitToRoom };
