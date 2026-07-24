import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import Driver from '../models/Driver.js';
import Client from '../models/Client.js';
import Order from '../models/Order.js';
import dotenv from 'dotenv';

dotenv.config();

// Clear all collections and add test data
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear all collections and drop old indexes
    console.log('🗑️  Clearing collections...');

    // Drop entire collections to remove old indexes
    try {
      await Admin.collection.drop();
      console.log('✅ Dropped Admin collection');
    } catch (error) {
      await Admin.deleteMany({});
      console.log('✅ Cleared Admin collection');
    }

    try {
      await Driver.collection.drop();
      console.log('✅ Dropped Driver collection');
    } catch (error) {
      await Driver.deleteMany({});
      console.log('✅ Cleared Driver collection');
    }

    try {
      await Client.collection.drop();
      console.log('✅ Dropped Client collection');
    } catch (error) {
      await Client.deleteMany({});
      console.log('✅ Cleared Client collection');
    }

    try {
      await Order.collection.drop();
      console.log('✅ Dropped Order collection');
    } catch (error) {
      await Order.deleteMany({});
      console.log('✅ Cleared Order collection');
    }

    console.log('✅ All collections cleared');

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const driverPassword = await bcrypt.hash('driver123', 10);
    const clientPassword = await bcrypt.hash('client123', 10);

    // Create Super Admin
    const superAdmin = await Admin.create({
      name: 'Super Admin',
      email: 'superadmin@wasal.com',
      phone: '+966500000001',
      password: adminPassword,
      role: 'super_admin',
      permissions: ['manage_users', 'manage_drivers', 'manage_orders', 'view_analytics', 'manage_admins'],
      isVerified: true
    });
    console.log('✅ Super Admin created');

    // Create Regular Admins
    const admin1 = await Admin.create({
      name: 'Admin Ahmed',
      email: 'admin1@wasal.com',
      phone: '+966500000002',
      password: adminPassword,
      role: 'admin',
      permissions: ['manage_drivers', 'manage_orders', 'view_analytics'],
      isVerified: true
    });

    const admin2 = await Admin.create({
      name: 'Admin Mohammed',
      email: 'admin2@wasal.com',
      phone: '+966500000003',
      password: adminPassword,
      role: 'admin',
      permissions: ['manage_users', 'view_analytics'],
      isVerified: true
    });
    console.log('✅ Admins created');

    // Create Drivers
    const driver1 = await Driver.create({
      name: 'Driver Khalid',
      email: 'driver1@wasal.com',
      phone: '+966500000010',
      password: driverPassword,
      vehicleType: 'motorcycle',
      vehicleNumber: 'ABC-1234',
      licenseNumber: 'LIC-001',
      isAvailable: true,
      isApproved: true,
      isVerified: true,
      rating: 4.5,
      ratingCount: 20,
      totalDeliveries: 20,
      totalEarnings: 500,
      balance: 500
    });

    const driver2 = await Driver.create({
      name: 'Driver Omar',
      email: 'driver2@wasal.com',
      phone: '+966500000011',
      password: driverPassword,
      vehicleType: 'car',
      vehicleNumber: 'XYZ-5678',
      licenseNumber: 'LIC-002',
      isAvailable: true,
      isApproved: true,
      isVerified: true,
      rating: 4.8,
      ratingCount: 35,
      totalDeliveries: 35,
      totalEarnings: 900,
      balance: 900
    });

    const driver3 = await Driver.create({
      name: 'Driver Hassan',
      email: 'driver3@wasal.com',
      phone: '+966500000012',
      password: driverPassword,
      vehicleType: 'bicycle',
      vehicleNumber: 'BIC-9012',
      licenseNumber: 'LIC-003',
      isAvailable: false,
      isApproved: true,
      isVerified: true,
      rating: 4.2,
      ratingCount: 15,
      totalDeliveries: 15,
      totalEarnings: 300,
      balance: 300
    });

    const driver4 = await Driver.create({
      name: 'Driver Ali',
      email: 'driver4@wasal.com',
      phone: '+966500000013',
      password: driverPassword,
      vehicleType: 'motorcycle',
      vehicleNumber: 'MOT-3456',
      licenseNumber: 'LIC-004',
      isAvailable: true,
      isApproved: false,
      isVerified: true,
      rating: 0,
      ratingCount: 0,
      totalDeliveries: 0,
      totalEarnings: 0,
      balance: 0
    });
    console.log('✅ Drivers created');

    // Create Clients
    const client1 = await Client.create({
      name: 'Client Fatima',
      email: 'client1@wasal.com',
      phone: '+966500000020',
      password: clientPassword,
      isVerified: true
    });

    const client2 = await Client.create({
      name: 'Client Sarah',
      email: 'client2@wasal.com',
      phone: '+966500000021',
      password: clientPassword,
      isVerified: true
    });

    const client3 = await Client.create({
      name: 'Client Layla',
      email: 'client3@wasal.com',
      phone: '+966500000022',
      password: clientPassword,
      isVerified: true
    });

    const client4 = await Client.create({
      name: 'Client Noor',
      email: 'client4@wasal.com',
      phone: '+966500000023',
      password: clientPassword,
      isVerified: true
    });

    const client5 = await Client.create({
      name: 'Client Aisha',
      email: 'client5@wasal.com',
      phone: '+966500000024',
      password: clientPassword,
      isVerified: true
    });
    console.log('✅ Clients created');

    // Create Orders
    const order1 = await Order.create({
      client: client1._id,
      driver: driver1._id,
      pickupLocation: {
        address: 'Riyadh, Olaya Street',
        lat: 24.7136,
        lng: 46.6753,
        contactName: 'Restaurant Owner',
        contactPhone: '+966500000100'
      },
      deliveryLocation: {
        address: 'Riyadh, Malaz District',
        lat: 24.6333,
        lng: 46.7167,
        contactName: 'Fatima',
        contactPhone: '+966500000020'
      },
      packageDetails: {
        weight: 2,
        size: 'medium',
        description: 'Food delivery'
      },
      distance: 5.2,
      price: 25,
      platformFee: 5,
      driverEarnings: 20,
      status: 'delivered',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      createdAt: new Date('2025-01-15'),
      acceptedAt: new Date('2025-01-15'),
      pickedUpAt: new Date('2025-01-15'),
      deliveredAt: new Date('2025-01-15')
    });

    const order2 = await Order.create({
      client: client2._id,
      driver: driver2._id,
      pickupLocation: {
        address: 'Riyadh, Granada Mall',
        lat: 24.7247,
        lng: 46.6896,
        contactName: 'Store Manager',
        contactPhone: '+966500000101'
      },
      deliveryLocation: {
        address: 'Riyadh, Nakheel District',
        lat: 24.7467,
        lng: 46.7083,
        contactName: 'Sarah',
        contactPhone: '+966500000021'
      },
      packageDetails: {
        weight: 1,
        size: 'small',
        description: 'Electronics'
      },
      distance: 3.8,
      price: 18,
      platformFee: 4,
      driverEarnings: 14,
      status: 'delivered',
      paymentMethod: 'bank',
      paymentStatus: 'paid',
      createdAt: new Date('2025-01-16'),
      acceptedAt: new Date('2025-01-16'),
      pickedUpAt: new Date('2025-01-16'),
      deliveredAt: new Date('2025-01-16')
    });

    const order3 = await Order.create({
      client: client3._id,
      driver: driver1._id,
      pickupLocation: {
        address: 'Riyadh, Panorama Mall',
        lat: 24.7328,
        lng: 46.6997,
        contactName: 'Shop Owner',
        contactPhone: '+966500000102'
      },
      deliveryLocation: {
        address: 'Riyadh, Al Olaya',
        lat: 24.7136,
        lng: 46.6753,
        contactName: 'Layla',
        contactPhone: '+966500000022'
      },
      packageDetails: {
        weight: 5,
        size: 'large',
        description: 'Furniture'
      },
      distance: 2.5,
      price: 35,
      platformFee: 7,
      driverEarnings: 28,
      status: 'pending',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      createdAt: new Date()
    });

    const order4 = await Order.create({
      client: client4._id,
      driver: driver2._id,
      pickupLocation: {
        address: 'Riyadh, Kingdom Centre',
        lat: 24.7155,
        lng: 46.6842,
        contactName: 'Office Manager',
        contactPhone: '+966500000103'
      },
      deliveryLocation: {
        address: 'Riyadh, Diplomatic Quarter',
        lat: 24.6877,
        lng: 46.6356,
        contactName: 'Noor',
        contactPhone: '+966500000023'
      },
      packageDetails: {
        weight: 0.5,
        size: 'small',
        description: 'Documents'
      },
      distance: 6.1,
      price: 30,
      platformFee: 6,
      driverEarnings: 24,
      status: 'accepted',
      paymentMethod: 'bank',
      paymentStatus: 'pending',
      createdAt: new Date(),
      acceptedAt: new Date()
    });

    const order5 = await Order.create({
      client: client5._id,
      driver: driver3._id,
      pickupLocation: {
        address: 'Riyadh, Riyadh Gallery',
        lat: 24.7428,
        lng: 46.6856,
        contactName: 'Restaurant',
        contactPhone: '+966500000104'
      },
      deliveryLocation: {
        address: 'Riyadh, Al Sulimaniyah',
        lat: 24.7256,
        lng: 46.6728,
        contactName: 'Aisha',
        contactPhone: '+966500000024'
      },
      packageDetails: {
        weight: 3,
        size: 'medium',
        description: 'Groceries'
      },
      distance: 4.3,
      price: 22,
      platformFee: 5,
      driverEarnings: 17,
      status: 'picked_up',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      createdAt: new Date(),
      acceptedAt: new Date(),
      pickedUpAt: new Date()
    });
    console.log('✅ Orders created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Super Admin: 1`);
    console.log(`   - Admins: 2`);
    console.log(`   - Drivers: 4 (3 approved, 1 pending)`);
    console.log(`   - Clients: 5`);
    console.log(`   - Orders: 5 (2 delivered, 1 pending, 1 accepted, 1 picked_up)`);
    console.log('\n🔐 Login Credentials:');
    console.log(`   Super Admin: superadmin@wasal.com / admin123`);
    console.log(`   Admin: admin1@wasal.com / admin123`);
    console.log(`   Driver: driver1@wasal.com / driver123`);
    console.log(`   Client: client1@wasal.com / client123`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
