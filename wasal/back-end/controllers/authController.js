import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Driver from '../models/Driver.js';
import Client from '../models/Client.js';
import { createLog } from './logController.js';
import { sendOTPEmail } from '../services/emailService.js';

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Register with OTP
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const userRole = role || 'client';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + (process.env.OTP_EXPIRE || 15) * 60 * 1000);

    let user;

    if (userRole === 'admin' || userRole === 'super_admin') {
      // Check if admin exists
      const existingAdmin = await Admin.findOne({ $or: [{ email }, { phone }] });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Admin already exists' });
      }

      user = await Admin.create({
        name,
        email,
        phone,
        password: hashedPassword,
        role: userRole,
        isVerified: true,
        otp: {
          code: otp,
          expiresAt: otpExpiresAt
        }
      });
    } else if (userRole === 'driver') {
      // Check if driver exists
      const existingDriver = await Driver.findOne({ $or: [{ email }, { phone }] });
      if (existingDriver) {
        return res.status(400).json({ message: 'Driver already exists' });
      }

      user = await Driver.create({
        name,
        email,
        phone,
        password: hashedPassword,
        vehicleType: req.body.vehicleType || 'motorcycle',
        vehicleNumber: req.body.vehicleNumber || '',
        licenseNumber: req.body.licenseNumber || '',
        otp: {
          code: otp,
          expiresAt: otpExpiresAt
        }
      });
    } else {
      // Client
      const existingClient = await Client.findOne({ $or: [{ email }, { phone }] });
      if (existingClient) {
        return res.status(400).json({ message: 'Client already exists' });
      }

      user = await Client.create({
        name,
        email,
        phone,
        password: hashedPassword,
        otp: {
          code: otp,
          expiresAt: otpExpiresAt
        }
      });
    }

    // Send OTP email
    await sendOTPEmail(email, otp, name);

    res.status(201).json({
      message: 'User registered successfully. Please verify with OTP sent to your email.',
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { userId, otp, role } = req.body;

    let user;
    if (role === 'admin' || role === 'super_admin') {
      user = await Admin.findById(userId);
    } else if (role === 'driver') {
      user = await Driver.findById(userId);
    } else {
      user = await Client.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp.code !== otp || user.otp.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    res.status(200).json({
      message: 'Account verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'client'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user;
    // Try to find user in all collections
    user = await Admin.findOne({ email }).select('+password');
    if (!user) {
      user = await Driver.findOne({ email }).select('+password');
    }
    if (!user) {
      user = await Client.findOne({ email }).select('+password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your account first' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: 'Your account has been suspended' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    // Log login action for admin users
    if (user.role === 'admin' || user.role === 'super_admin') {
      await createLog(
        user._id,
        'login',
        'admin',
        user._id,
        `User ${user.name} logged in`,
        req.ip,
        req.get('user-agent')
      );
    }

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'client'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot Password - Send OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    let user;
    user = await Admin.findOne({ email });
    if (!user) {
      user = await Driver.findOne({ email });
    }
    if (!user) {
      user = await Client.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + (process.env.OTP_EXPIRE || 15) * 60 * 1000);

    user.otp = {
      code: otp,
      expiresAt: otpExpiresAt
    };
    await user.save();

    // Send OTP email
    await sendOTPEmail(email, otp, user.name);

    res.status(200).json({
      message: 'OTP sent to your email'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset Password with OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    let user;
    user = await Admin.findOne({ email }).select('+password');
    if (!user) {
      user = await Driver.findOne({ email }).select('+password');
    }
    if (!user) {
      user = await Client.findOne({ email }).select('+password');
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp.code !== otp || user.otp.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    let user;
    user = await Admin.findById(req.user.id);
    if (!user) {
      user = await Driver.findById(req.user.id);
    }
    if (!user) {
      user = await Client.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
