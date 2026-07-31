import Client from '../models/Client.js';
import Driver from '../models/Driver.js';
import Order from '../models/Order.js';
import Admin from '../models/Admin.js';
import RechargeRequest from '../models/RechargeRequest.js';
import BalanceTransaction from '../models/BalanceTransaction.js';
import bcrypt from 'bcryptjs';
import { createLog } from './logController.js';
import { createNotification } from './notificationController.js';
import { emitToUser } from '../services/socketService.js';

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

// Add credit to driver (cash top-up entered directly by an employee on the
// driver's page, or a manual adjustment). Logs a BalanceTransaction and
// notifies the driver.
export const addDriverCredit = async (req, res) => {
  try {
    const { driverId, amount, description } = req.body;
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'يرجى إدخال قيمة صحيحة للمبلغ' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const balanceBefore = driver.balance;
    driver.balance += parsedAmount;
    await driver.save();

    const transaction = await BalanceTransaction.create({
      driver: driver._id,
      type: 'recharge_cash',
      amount: parsedAmount,
      balanceBefore,
      balanceAfter: driver.balance,
      performedBy: req.user._id,
      note: description || 'شحن رصيد نقدي بواسطة الموظف'
    });

    const notification = await createNotification(
      driver._id,
      'balance_credited',
      'تم شحن رصيدك',
      `تم إضافة ${parsedAmount.toFixed(2)} جنيه إلى رصيدك (نقداً). رصيدك الحالي: ${driver.balance.toFixed(2)} جنيه.`,
      { driverId: driver._id, amount: parsedAmount },
      'Driver',
      true
    );
    emitToUser(driver._id, 'balance:updated', { balance: driver.balance });

    res.status(200).json({
      message: 'Credit added successfully',
      driver: {
        id: driver._id,
        balance: driver.balance,
        totalEarnings: driver.totalEarnings
      },
      transaction,
      notification
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a driver's full balance transaction history (recharges + commission
// deductions), each with a clear timestamp - shown on the driver's page in
// the control panel.
export const getDriverBalanceTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await BalanceTransaction.find({ driver: id })
      .populate('order', 'orderNumber')
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(300);
    res.status(200).json({ transactions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List recharge requests (bank-transfer top-up requests submitted by
// drivers), optionally filtered by status. Used by the "طلبات شحن الرصيد"
// page in the control panel.
export const getRechargeRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const rechargeRequests = await RechargeRequest.find(filter)
      .populate('driver', 'name phone balance')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ rechargeRequests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin approves a driver's bank-transfer recharge request after verifying
// the transaction: manually enters the amount to credit, which is then
// added to the driver's balance.
export const approveRechargeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'يرجى إدخال قيمة الرصيد المراد إضافتها' });
    }

    const rechargeRequest = await RechargeRequest.findById(id);
    if (!rechargeRequest) {
      return res.status(404).json({ message: 'طلب الشحن غير موجود' });
    }
    if (rechargeRequest.status !== 'pending') {
      return res.status(400).json({ message: 'تمت مراجعة هذا الطلب من قبل' });
    }

    const driver = await Driver.findById(rechargeRequest.driver);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const balanceBefore = driver.balance;
    driver.balance += parsedAmount;
    await driver.save();

    rechargeRequest.status = 'approved';
    rechargeRequest.approvedAmount = parsedAmount;
    rechargeRequest.reviewedBy = req.user._id;
    rechargeRequest.reviewedAt = new Date();
    await rechargeRequest.save();

    await BalanceTransaction.create({
      driver: driver._id,
      type: 'recharge_bank',
      amount: parsedAmount,
      balanceBefore,
      balanceAfter: driver.balance,
      rechargeRequest: rechargeRequest._id,
      performedBy: req.user._id,
      note: `شحن عبر التحويل البنكي - آخر 6 أرقام: ${rechargeRequest.transactionLast6}`
    });

    const notification = await createNotification(
      driver._id,
      'recharge_approved',
      'تمت الموافقة على طلب الشحن',
      `تمت الموافقة على طلب شحن رصيدك وإضافة ${parsedAmount.toFixed(2)} جنيه. رصيدك الحالي: ${driver.balance.toFixed(2)} جنيه.`,
      { driverId: driver._id, amount: parsedAmount, status: 'approved' },
      'Driver',
      true
    );
    emitToUser(driver._id, 'balance:updated', { balance: driver.balance });
    emitToUser(driver._id, 'recharge:reviewed', { status: 'approved', rechargeRequest });

    res.status(200).json({ message: 'تمت الموافقة على الطلب وإضافة الرصيد', rechargeRequest, notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin rejects a driver's bank-transfer recharge request (data didn't
// match/couldn't be verified). No balance change; driver is notified.
export const rejectRechargeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rechargeRequest = await RechargeRequest.findById(id);
    if (!rechargeRequest) {
      return res.status(404).json({ message: 'طلب الشحن غير موجود' });
    }
    if (rechargeRequest.status !== 'pending') {
      return res.status(400).json({ message: 'تمت مراجعة هذا الطلب من قبل' });
    }

    rechargeRequest.status = 'rejected';
    rechargeRequest.reviewedBy = req.user._id;
    rechargeRequest.reviewedAt = new Date();
    rechargeRequest.reviewNote = reason || '';
    await rechargeRequest.save();

    const notification = await createNotification(
      rechargeRequest.driver,
      'recharge_rejected',
      'تم رفض طلب الشحن',
      reason
        ? `تم رفض طلب شحن رصيدك: ${reason}`
        : 'تم رفض طلب شحن رصيدك، يرجى التأكد من بيانات التحويل والمحاولة مرة أخرى.',
      { driverId: rechargeRequest.driver, status: 'rejected' },
      'Driver',
      true
    );
    emitToUser(rechargeRequest.driver, 'recharge:reviewed', { status: 'rejected', rechargeRequest });

    res.status(200).json({ message: 'تم رفض الطلب', rechargeRequest, notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get driver details
export const getDriverDetails = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .select('-password');

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

// Update driver images / document links (admin only - the ONLY place these are set)
export const updateDriverImages = async (req, res) => {
  try {
    const { driverId, profileImage, vehicleImage, licenseImage, nationalIdImage, inspectionCertificateImage } = req.body;

    if (!driverId) {
      return res.status(400).json({ message: 'Driver ID is required' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Update image/document URLs if provided
    if (profileImage !== undefined) driver.profileImage = profileImage;
    if (vehicleImage !== undefined) driver.vehicleImage = vehicleImage;
    if (licenseImage !== undefined) driver.licenseImage = licenseImage;
    if (nationalIdImage !== undefined) driver.nationalIdImage = nationalIdImage;
    if (inspectionCertificateImage !== undefined) driver.inspectionCertificateImage = inspectionCertificateImage;

    await driver.save();

    // Log the action
    await createLog(
      req.user._id,
      'update',
      'driver',
      driver._id,
      `Updated images for driver ${driver.name}`,
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({
      message: 'Images updated successfully',
      driver: {
        profileImage: driver.profileImage,
        vehicleImage: driver.vehicleImage,
        licenseImage: driver.licenseImage,
        nationalIdImage: driver.nationalIdImage,
        inspectionCertificateImage: driver.inspectionCertificateImage
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change own password (any admin/staff member, i.e. admin or super_admin)
export const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'يرجى إدخال كلمة المرور الحالية والجديدة' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    // Only ever touches the authenticated admin's own record - never other data.
    const admin = await Admin.findById(req.user.id).select('+password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    // Log the action
    await createLog(
      req.user._id,
      'update',
      'admin',
      admin._id,
      `Changed password for admin ${admin.name} (${admin.email})`,
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({ message: 'تم تغيير كلمة المرور بنجاح' });
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
