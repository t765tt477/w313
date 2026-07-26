import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { initSocket } from './services/socketService.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Middleware
const staticAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, mobile apps, server-to-server) with no Origin header
    if (!origin) return callback(null, true);
    // Any localhost/127.0.0.1 port - Vite silently picks 5174/5175/... when 5173 is busy,
    // which used to get rejected here and made every request (including registration) fail.
    if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
    if (staticAllowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import driverRoutes from './routes/drivers.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import logRoutes from './routes/logs.js';
import cityRoutes from './routes/cities.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/cities', cityRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Wasal Delivery API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      drivers: '/api/drivers',
      orders: '/api/orders',
      admin: '/api/admin',
      notifications: '/api/notifications',
      logs: '/api/logs'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Wasal API is running' });
});

initSocket(httpServer);

const PORT = process.env.PORT || 50000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready for real-time notifications`);
});
