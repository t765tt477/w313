import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { notificationAPI } from '../services/api';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    orderId?: string;
    driverId?: string;
    amount?: number;
    status?: string;
  };
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(notifications.map(n =>
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationAPI.deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n._id !== notificationId));
      if (!notifications.find(n => n._id === notificationId)?.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-EG');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
        return '📦';
      case 'driver_approval':
        return '🚗';
      case 'driver_credit':
        return '💰';
      case 'order_update':
        return '📋';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
      >
        <Bell className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-green-600 hover:text-green-700 font-semibold flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                تعيين الكل كمقروء
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${!notification.isRead ? 'bg-green-50/50' : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-semibold text-sm ${!notification.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="flex-shrink-0 p-1 hover:bg-green-100 rounded-lg transition-colors"
                            title="تعيين كمقروء"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-2">{formatTime(notification.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="flex-shrink-0 p-1 hover:bg-red-100 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-center text-sm text-slate-600 hover:text-slate-900 font-semibold"
              >
                إغلاق
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
