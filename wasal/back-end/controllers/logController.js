import Log from '../models/Log.js';

// Get all logs with filtering
export const getAllLogs = async (req, res) => {
  try {
    const { action, entity, startDate, endDate, limit = 100 } = req.query;

    const filter = {};

    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await Log.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const total = await Log.countDocuments(filter);

    res.status(200).json({ logs, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single log by ID
export const getLogById = async (req, res) => {
  try {
    const log = await Log.findById(req.params.id)
      .populate('user', 'name email role');

    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }

    res.status(200).json({ log });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create log (helper function)
export const createLog = async (userId, action, entity, entityId = null, details = '', ipAddress = '', userAgent = '') => {
  try {
    const log = await Log.create({
      user: userId,
      action,
      entity,
      entityId,
      details,
      ipAddress,
      userAgent
    });
    return log;
  } catch (error) {
    console.error('Error creating log:', error);
    return null;
  }
};

// Delete old logs (cleanup)
export const deleteOldLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Log.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    res.status(200).json({
      message: `Deleted ${result.deletedCount} logs older than ${days} days`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
