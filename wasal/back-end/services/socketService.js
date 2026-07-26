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
    }
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

export default { initSocket, getIO, emitToUser, emitToRole };
