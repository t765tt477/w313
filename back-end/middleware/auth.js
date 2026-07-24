import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Driver from '../models/Driver.js';
import Client from '../models/Client.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find user in all collections
    req.user = await Admin.findById(decoded.id);
    if (!req.user) {
      req.user = await Driver.findById(decoded.id);
    }
    if (!req.user) {
      req.user = await Client.findById(decoded.id);
    }

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (req.user.isSuspended) {
      return res.status(403).json({ message: 'Your account has been suspended' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to access this route' });
    }
    next();
  };
};

export const authorizeSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admin can access this route' });
  }
  next();
};
