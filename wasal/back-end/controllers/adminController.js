import Client from '../models/Client.js';
import Driver from '../models/Driver.js';
import Order from '../models/Order.js';
import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';
import { createLog } from './logController.js';

// Get all drivers
export const getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find()
      .select('name email phone vehicleType vehicleNumber isAvailable balance totalEarnings totalDeliveries rating isApproved createdAt')
      .sort({ createdAt: -1 });
    res.status(200).json({ drivers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add credit to driver
export const addDriverCredit = async (req, res) => {
  try {
    const { driverId, amount, description } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.balance += amount;
    driver.totalEarnings += amount;
    await driver.save();

    res.status(200).json({
      message: 'Credit added successfully',
      driver: {
        id: driver._id,
        balance: driver.balance,
        totalEarnings: driver.totalEarnings
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get driver details
export const getDriverDetails = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const orders = await Order.find({ driver: driver._id })
      .populate('client', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ driver, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('client', 'name phone')
      .populate('driver')
      .sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all clients
export const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find()
      .select('name email phone address totalOrders totalSpent createdAt')
      .sort({ createdAt: -1 });
    res.status(200).json({ clients });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get analytics
export const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await Client.countDocuments();
    const totalDrivers = await Driver.countDocuments();
    const activeDrivers = await Driver.countDocuments({ isAvailable: true });
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'delivered' });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    const totalRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    const driverEarnings = await Driver.aggregate([
      { $group: { _id: null, total: { $sum: '$totalEarnings' } } }
    ]);

    res.status(200).json({
      totalUsers,
      totalDrivers,
      activeDrivers,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      driverEarnings: driverEarnings[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve driver
export const approveDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.isApproved = true;
    await driver.save();

    res.status(200).json({ message: 'Driver approved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin Management Functions (Super Admin Only)

// Get all admins
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .populate('suspendedBy', 'name email')
      .select('name email phone role permissions isSuspended suspendedBy suspendedAt suspensionReason createdAt')
      .sort({ createdAt: -1 });
    res.status(200).json({ admins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new admin
export const createAdmin = async (req, res) => {
  try {
    const { name, email, phone, password, permissions, role } = req.body;

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { phone }] });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || 'admin',
      permissions: permissions || ['manage_users', 'manage_drivers', 'manage_orders', 'view_analytics'],
      isVerified: true
    });

    // Log the action
    await createLog(
      req.user._id,
      'create',
      'admin',
      admin._id,
      `Created admin ${name} (${email})`,
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update admin
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, permissions } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update fields
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    if (permissions) admin.permissions = permissions;

    await admin.save();

    // Log the action
    await createLog(
      req.user._id,
      'update',
      'admin',
      admin._id,
      `Updated admin ${admin.name} (${admin.email})`,
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({
      message: 'Admin updated successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete admin
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Log the action before deletion
    await createLog(
      req.user._id,
      'delete',
      'admin',
      admin._id,
      `Deleted admin ${admin.name} (${admin.email})`,
      req.ip,
      req.get('user-agent')
    );

    // Delete admin
    await Admin.findByIdAndDelete(id);

    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Suspend/unsuspend admin
export const toggleAdminSuspension = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Toggle suspension
    admin.isSuspended = !admin.isSuspended;

    if (admin.isSuspended) {
      admin.suspendedBy = req.user._id;
      admin.suspendedAt = new Date();
      admin.suspensionReason = reason || 'No reason provided';
    } else {
      admin.suspendedBy = null;
      admin.suspendedAt = null;
      admin.suspensionReason = null;
    }

    await admin.save();

    res.status(200).json({
      message: admin.isSuspended ? 'Admin suspended successfully' : 'Admin unsuspended successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        isSuspended: admin.isSuspended,
        suspendedBy: admin.suspendedBy,
        suspendedAt: admin.suspendedAt,
        suspensionReason: admin.suspensionReason
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
