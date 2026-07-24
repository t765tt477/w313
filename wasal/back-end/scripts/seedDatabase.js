import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
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

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await Client.deleteMany({});
    await Driver.deleteMany({});
    await Order.deleteMany({});
    await Admin.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Drop all problematic indexes from Admin collection
    try {
      const indexes = await Admin.collection.indexes();
      for (const index of indexes) {
        if (index.name !== '_id_' && index.name !== 'user_1') {
          await Admin.collection.dropIndex(index.name);
          console.log(`🗑️  Dropped index: ${index.name}`);
        }
      }
    } catch (error) {
      // Index doesn't exist, that's fine
      console.log('ℹ️  No problematic indexes to drop from Admin');
    }

    // Drop all problematic indexes from Order collection
    try {
      const indexes = await Order.collection.indexes();
      for (const index of indexes) {
        if (index.name !== '_id_') {
          await Order.collection.dropIndex(index.name);
          console.log(`🗑️  Dropped index from Orders: ${index.name}`);
        }
      }
    } catch (error) {
      // Index doesn't exist, that's fine
      console.log('ℹ️  No problematic indexes to drop from Orders');
    }

    // Create Super Admin
    const superAdminPassword = await bcrypt.hash('admin123', 10);
    const superAdmin = await Admin.create({
      name: 'Super Admin',
      email: 'superadmin@wasal.com',
      phone: '+966500000000',
      password: superAdminPassword,
      role: 'super_admin',
      permissions: ['manage_users', 'manage_drivers', 'manage_orders', 'view_analytics', 'manage_admins'],
      isVerified: true
    });
    console.log('✅ Created Super Admin:', superAdmin.email);

    // Create Regular Admins
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin1 = await Admin.create({
      name: 'Admin One',
      email: 'admin1@wasal.com',
      phone: '+966500000001',
      password: adminPassword,
      role: 'admin',
      permissions: ['manage_users', 'manage_drivers', 'manage_orders', 'view_analytics'],
      isVerified: true
    });

    const admin2 = await Admin.create({
      name: 'Admin Two',
      email: 'admin2@wasal.com',
      phone: '+966500000002',
      password: adminPassword,
      role: 'admin',
      permissions: ['manage_users', 'manage_drivers', 'manage_orders', 'view_analytics'],
      isVerified: true
    });
    console.log('✅ Created 2 Regular Admins');

    // Create Clients
    const clientPassword = await bcrypt.hash('client123', 10);
    const clients = [];
    for (let i = 1; i <= 10; i++) {
      const client = await Client.create({
        name: `Client ${i}`,
        email: `client${i}@wasal.com`,
        phone: `+9665000000${i + 2}`,
        password: clientPassword,
        isVerified: true
      });
      clients.push(client);
    }
    console.log('✅ Created 10 Clients');

    // Create Drivers
    const driverPassword = await bcrypt.hash('driver123', 10);
    const drivers = [];
    const vehicleTypes = ['car', 'motorcycle', 'bicycle'];
    for (let i = 1; i <= 5; i++) {
      const driver = await Driver.create({
        name: `Driver ${i}`,
        email: `driver${i}@wasal.com`,
        phone: `+9665000001${i}`,
        password: driverPassword,
        vehicleType: vehicleTypes[i % 3],
        vehicleNumber: `ABC${1000 + i}`,
        licenseNumber: `LIC${2000 + i}`,
        isAvailable: true,
        isApproved: true,
        isVerified: true,
        currentLocation: {
          lat: 24.7136 + (i * 0.01),
          lng: 46.6753 + (i * 0.01)
        },
        rating: 4.0 + (i * 0.1),
        ratingCount: i * 5,
        totalDeliveries: i * 10,
        totalEarnings: i * 500,
        balance: i * 100
      });
      drivers.push(driver);
    }
    console.log('✅ Created 5 Drivers');

    // Create Orders
    const statuses = ['pending', 'accepted', 'picked_up', 'delivered', 'cancelled'];
    const paymentMethods = ['cash', 'bank'];
    for (let i = 0; i < 15; i++) {
      const client = users[i % users.length];
      const driver = i < drivers.length ? drivers[i] : null;
      const status = statuses[i % statuses.length];

      const distance = 5 + (i * 2);
      const weight = 1 + (i * 0.5);
      const size = ['small', 'medium', 'large'][i % 3];
      const price = (distance * 2.00) + (weight * 0.50) + (size === 'large' ? 2 : size === 'medium' ? 1 : 0);
      const platformFee = price * 0.10;
      const driverEarnings = price * 0.90;

      const order = await Order.create({
        client: client._id,
        driver: driver?._id || null,
        pickupLocation: {
          address: `Pickup Location ${i + 1}`,
          lat: 24.7136 + (i * 0.005),
          lng: 46.6753 + (i * 0.005),
          contactName: `Sender ${i + 1}`,
          contactPhone: `+9665000000${i + 2}`
        },
        deliveryLocation: {
          address: `Delivery Location ${i + 1}`,
          lat: 24.7236 + (i * 0.005),
          lng: 46.6853 + (i * 0.005),
          contactName: `Receiver ${i + 1}`,
          contactPhone: `+9665000001${i + 2}`
        },
        packageDetails: {
          weight: weight,
          size: size,
          description: `Package ${i + 1}`
        },
        distance: distance,
        price: price,
        platformFee: platformFee,
        driverEarnings: driverEarnings,
        status: status,
        paymentMethod: paymentMethods[i % 2],
        paymentStatus: status === 'delivered' ? 'paid' : 'pending',
        notes: `Order notes ${i + 1}`,
        acceptedAt: status !== 'pending' && status !== 'cancelled' ? new Date(Date.now() - (i * 3600000)) : null,
        pickedUpAt: status === 'picked_up' || status === 'delivered' ? new Date(Date.now() - (i * 1800000)) : null,
        deliveredAt: status === 'delivered' ? new Date(Date.now() - (i * 900000)) : null
      });
    }
    console.log('✅ Created 15 Orders');

    console.log('✅ Database seeding completed successfully');
    console.log('\n📋 Login Credentials:');
    console.log('Super Admin: superadmin@wasal.com / admin123');
    console.log('Admin 1: admin1@wasal.com / admin123');
    console.log('Admin 2: admin2@wasal.com / admin123');
    console.log('Client: client1@wasal.com / client123');
    console.log('Driver: driver1@wasal.com / driver123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    process.exit(1);
  }
};

connectDB().then(() => {
  seedDatabase();
});
