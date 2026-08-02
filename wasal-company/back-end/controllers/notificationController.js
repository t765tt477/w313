import Notification from '../models/Notification.js';
import { emitToUser, emitToRole } from '../services/socketService.js';

// Get all notifications for the logged-in admin
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      isRead: false 
    });

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create notification (helper function, not exposed as route)
export const createNotification = async (recipientId, type, title, message, data = {}, recipientModel = 'Admin', sound = true) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      recipientModel,
      type,
      title,
      message,
      data,
      sound
    });
    emitToUser(recipientId, 'notification:new', notification);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Broadcast a notification to every currently-connected admin (does not persist
// per-admin rows - it's a live-only ping used for things like "new order came in").
export const broadcastToAdmins = (type, title, message, data = {}, sound = true) => {
  emitToRole('admin', 'notification:new', {
    type, title, message, data, sound, createdAt: new Date(), isRead: false, isLive: true
  });
  emitToRole('super_admin', 'notification:new', {
    type, title, message, data, sound, createdAt: new Date(), isRead: false, isLive: true
  });
};
