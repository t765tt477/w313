import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Package, Car, DollarSign, Clipboard, RefreshCw, Timer, AlertTriangle, CheckCircle, ArrowLeft, Flag, ArrowRight } from 'lucide-react';
import { notificationAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { playNotificationSound } from '../utils/sound';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sound?: boolean;
  isLive?: boolean;
  data?: {
    orderId?: string;
    driverId?: string;
    amount?: number;
    status?: string;
  };
}

interface NotificationsProps {
  user: any;
  onViewOrders?: () => void;
  onViewProfile?: () => void;
  onBack?: () => void;
}

export default function Notifications({ user, onViewOrders, onViewProfile, onBack }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = getSocket(token);

    const onNotification = (incoming: any) => {
      if (incoming?.sound) playNotificationSound();

      if (incoming?.isLive && !incoming._id) {
        const transient: Notification = { ...incoming, _id: `live-${Date.now()}`, isRead: false };
        setNotifications((prev) => [transient, ...prev].slice(0, 50));
        return;
      }

      setNotifications((prev) => {
        if (prev.some((n) => n._id === incoming._id)) return prev;
        return [incoming, ...prev].slice(0, 50);
      });
      setUnreadCount((c) => c + 1);
    };

    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setNotifications(notifications.map(n =>
      n._id === notificationId ? { ...n, isRead: true } : n
    ));
    setUnreadCount(Math.max(0, unreadCount - 1));

    if (notificationId.startsWith('live-')) return;

    try {
      await notificationAPI.markAsRead(notificationId);
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
    const wasUnread = !notifications.find(n => n._id === notificationId)?.isRead;
    setNotifications(notifications.filter(n => n._id !== notificationId));
    if (wasUnread) {
      setUnreadCount(Math.max(0, unreadCount - 1));
    }

    if (notificationId.startsWith('live-')) return;

    try {
      await notificationAPI.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }

    switch (notification.type) {
      case 'new_order':
      case 'order_update':
      case 'order_accepted':
      case 'order_rejected':
      case 'order_picked_up':
      case 'order_delivered':
      case 'order_no_driver':
        if (onViewOrders) onViewOrders();
        break;
      case 'driver_credit':
      case 'balance_credited':
      case 'low_balance':
      case 'recharge_approved':
      case 'recharge_rejected':
        if (onViewProfile) onViewProfile();
        break;
      default:
        break;
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
        return Package;
      case 'driver_credit':
      case 'balance_credited':
      case 'recharge_approved':
        return DollarSign;
      case 'order_update':
        return Clipboard;
      case 'order_rejected':
        return ArrowLeft;
      case 'order_picked_up':
        return Package;
      case 'order_delivered':
        return CheckCircle;
      case 'order_no_driver':
        return AlertTriangle;
      case 'recharge_rejected':
        return Flag;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_order':
        return 'text-blue-500 bg-blue-50 border border-blue-500';
      case 'driver_credit':
      case 'balance_credited':
      case 'recharge_approved':
        return 'text-yellow-500 bg-green-50 border border-yellow-500';
      case 'order_update':
        return 'text-yellow-500 bg-yellow-50';
      case 'order_rejected':
      case 'order_no_driver':
      case 'recharge_rejected':
        return 'text-red-500 bg-red-50';
      case 'order_delivered':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-green-500 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="top-spacing bg-green-500/10 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-green-100 rounded-full transition-colors"
                >
                  <ArrowRight className="w-5 h-5 text-green-500" />
                </button>
              )}
              <div className="flex items-center gap-1">
                <Bell className="w-6 h-6 text-green-500" />
                <h1 className="text-lg font-bold text-green-500">الإشعارات</h1>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-green-500 hover:text-green-600 flex items-center gap-1 px-3 py-2 bg-green-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">تحديد الكل مقروء</span>
                <span className="sm:hidden">الكل</span>
              </button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              لديك {unreadCount} إشعار غير مقروء
            </p>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-green-600 mb-2">لا توجد إشعارات</h3>
            <p className="text-gray-500">ستظهر هنا جميع إشعاراتك</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);

              return (
                <div
                  key={notification._id}
                  className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md ${!notification.isRead ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div>
                          <div className="flex justify-between items-center gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-2.5 rounded-full ${colorClass} flex-shrink-0`}>
                                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                              </div>
                              <h3 className="font-semibold text-green-600 text-sm sm:text-base line-clamp-1">
                                {notification.title}
                              </h3>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification._id);
                                  }}
                                  className="p-1 bg-green-100 hover:bg-green-200 rounded-full transition-colors"
                                  title="تحديد كمقروء"
                                >
                                  <Check className="w-4 h-4 text-green-500 font-bold" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification._id);
                                }}
                                className="p-1 hover:bg-red-50 bg-green-200 rounded-full transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4 text-red-500 hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm sm:text-base text-gray-600 mb-3 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs sm:text-sm text-yellow-600">
                            {formatTime(notification.createdAt)}
                          </p>
                          {!notification.isRead && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              جديد
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
