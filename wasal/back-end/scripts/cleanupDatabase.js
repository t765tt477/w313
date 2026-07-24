import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from '../models/Client.js';
import Driver from '../models/Driver.js';
import Order from '../models/Order.js';
import Admin from '../models/Admin.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const cleanupDatabase = async () => {
  try {
    console.log('🧹 Starting database cleanup...');

    // Delete all data from all collections
    const clientsDeleted = await Client.deleteMany({});
    console.log(`🗑️  Deleted ${clientsDeleted.deletedCount} clients`);

    const driversDeleted = await Driver.deleteMany({});
    console.log(`🗑️  Deleted ${driversDeleted.deletedCount} drivers`);

    const ordersDeleted = await Order.deleteMany({});
    console.log(`🗑️  Deleted ${ordersDeleted.deletedCount} orders`);

    const adminsDeleted = await Admin.deleteMany({});
    console.log(`🗑️  Deleted ${adminsDeleted.deletedCount} admins`);

    console.log('✅ Database cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
};

connectDB().then(() => {
  cleanupDatabase();
});
