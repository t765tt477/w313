import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Package, Car, DollarSign, Clipboard, RefreshCw, Timer, AlertTriangle, CheckCircle, ArrowLeft, Flag } from 'lucide-react';
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
  isLive?: boolean; // true for live-only pings that were never persisted (e.g. a reassignment ping)
  data?: {
    orderId?: string;
    driverId?: string;
    amount?: number;
    status?: string;
  };
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [creditRequestsCount, setCreditRequestsCount] = useState(0);
  const [chatMessagesCount, setChatMessagesCount] = useState(0);
  const [newAgentsCount, setNewAgentsCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [justArrived, setJustArrived] = useState(false); // drives the bell "shake" animation
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // Poll as a fallback in case the socket connection drops.
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Live notifications over the socket - instant, with sound, no waiting for
  // the next poll cycle.
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const socket = getSocket(token);

    const onNotification = (incoming: any) => {
      if (incoming?.sound) playNotificationSound();

      setJustArrived(true);
      setTimeout(() => setJustArrived(false), 1000);

      if (incoming?.isLive && !incoming._id) {
        // Live-only ping (e.g. "order reassigned") - not stored per-admin in
        // the DB, so give it a local id and surface it transiently at the
        // top of the list without inflating the persisted unread count.
        const transient: Notification = { ...incoming, _id: `live-${Date.now()}`, isRead: false };
        setNotifications((prev) => [transient, ...prev].slice(0, 50));
        return;
      }

      // Real, persisted notification meant for this admin.
      setNotifications((prev) => {
        if (prev.some((n) => n._id === incoming._id)) return prev; // avoid duplicates
        return [incoming, ...prev].slice(0, 50);
      });
      setUnreadCount((c) => c + 1);
    };

    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
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

      // Count specific notification types
      const unreadNotifications = response.data.notifications.filter((n: Notification) => !n.isRead);
      setCreditRequestsCount(unreadNotifications.filter((n: Notification) =>
        n.type === 'recharge_requested' || n.type === 'balance_credited' || n.type === 'low_balance'
      ).length);
      setChatMessagesCount(unreadNotifications.filter((n: Notification) => n.type === 'chat_message').length);
      setNewAgentsCount(unreadNotifications.filter((n: Notification) => n.type === 'driver_approval').length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setNotifications(notifications.map(n =>
      n._id === notificationId ? { ...n, isRead: true } : n
    ));
    setUnreadCount(Math.max(0, unreadCount - 1));

    if (notificationId.startsWith('live-')) return; // transient, nothing to persist

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

    if (notificationId.startsWith('live-')) return; // transient, nothing to persist

    try {
      await notificationAPI.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'recharge_requested':
      case 'balance_credited':
      case 'low_balance':
        navigate('/recharge-requests');
        break;
      case 'chat_message':
        navigate('/dashboard', { state: { openChat: true, conversationId: notification.data?.conversationId } });
        break;
      case 'driver_approval':
        if (notification.data?.driverId) {
          navigate(`/driver/${notification.data.driverId}`);
        } else {
          navigate('/dashboard', { state: { activeTab: 'drivers' } });
        }
        break;
      case 'new_order':
      case 'order_update':
      case 'order_accepted':
      case 'order_rejected':
      case 'order_picked_up':
      case 'order_delivered':
      case 'order_offer':
      case 'order_reassigned':
      case 'order_offer_expired':
      case 'order_no_driver':
        if (notification.data?.orderId) {
          navigate('/dashboard', { state: { activeTab: 'orders', orderId: notification.data.orderId } });
        } else {
          navigate('/dashboard', { state: { activeTab: 'orders' } });
        }
        break;
      default:
        // For other notification types, just close the dropdown
        break;
    }

    setIsOpen(false);
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
      case 'driver_approval':
        return Car;
      case 'driver_credit':
        return DollarSign;
      case 'order_update':
        return Clipboard;
      case 'order_offer':
      case 'order_reassigned':
        return RefreshCw;
      case 'order_offer_expired':
        return Timer;
      case 'order_no_driver':
        return AlertTriangle;
      case 'order_accepted':
        return CheckCircle;
      case 'order_rejected':
        return ArrowLeft;
      case 'order_picked_up':
        return Package;
      case 'order_delivered':
        return Flag;
      case 'recharge_requested':
      case 'balance_credited':
        return DollarSign;
      case 'low_balance':
        return AlertTriangle;
      case 'chat_message':
        return MessageCircle;
      default:
        return Bell;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-1.5 hover:bg-slate-100 rounded-xl transition-colors ${justArrived ? 'animate-bounce' : ''}`}
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

          {/* Notification Types Summary */}
          {unreadCount > 0 && (
            <div className="flex gap-2 p-3 border-b border-slate-100 bg-slate-50">
              <button
                onClick={() => {
                  navigate('/recharge-requests');
                  setIsOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${creditRequestsCount > 0 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-400'}`}
              >
                <DollarSign className="w-4 h-4" />
                طلبات الرصيد ({creditRequestsCount})
              </button>
              <button
                onClick={() => {
                  navigate('/dashboard', { state: { openChat: true } });
                  setIsOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${chatMessagesCount > 0 ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-400'}`}
              >
                <MessageCircle className="w-4 h-4" />
                الدردشة ({chatMessagesCount})
              </button>
              <button
                onClick={() => {
                  navigate('/dashboard', { state: { activeTab: 'drivers' } });
                  setIsOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${newAgentsCount > 0 ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-slate-100 text-slate-400'}`}
              >
                <Car className="w-4 h-4" />
                المندوبين ({newAgentsCount})
              </button>
            </div>
          )}

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
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-green-50/50' : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {(() => {
                        const Icon = getNotificationIcon(notification.type);
                        return <Icon className="w-5 h-5 text-green-600" />;
                      })()}
                    </div>
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
