import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:50000/api').replace(/\/api\/?$/, '');

let socket: Socket | null = null;

// Creates (once) and returns the shared socket connection, authenticated with
// the current JWT. Safe to call repeatedly - it reuses the existing socket
// unless the token changed.
export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    // Render-specific reconnection settings
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 45000,
    // Fallback to polling if WebSocket fails
    forceNew: true
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getExistingSocket(): Socket | null {
  return socket;
}
