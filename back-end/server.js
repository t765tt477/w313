import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
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
import uploadRoutes from './routes/upload.js';
import notificationRoutes from './routes/notifications.js';
import logRoutes from './routes/logs.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Wasal API is running' });
});

const PORT = process.env.PORT || 50000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
