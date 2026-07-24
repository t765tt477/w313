import Admin from '../models/Admin.js';
import Driver from '../models/Driver.js';
import Client from '../models/Client.js';
import bcrypt from 'bcryptjs';

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, profileImage } = req.body;

    let user;
    user = await Admin.findByIdAndUpdate(
      req.user.id,
      { name, email, phone, profileImage },
      { new: true, runValidators: true }
    );

    if (!user) {
      user = await Driver.findByIdAndUpdate(
        req.user.id,
        { name, email, phone, profileImage },
        { new: true, runValidators: true }
      );
    }

    if (!user) {
      user = await Client.findByIdAndUpdate(
        req.user.id,
        { name, email, phone, profileImage },
        { new: true, runValidators: true }
      );
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    let user;
    user = await Admin.findById(req.user.id).select('+password');
    if (!user) {
      user = await Driver.findById(req.user.id).select('+password');
    }
    if (!user) {
      user = await Client.findById(req.user.id).select('+password');
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
