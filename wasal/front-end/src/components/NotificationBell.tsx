import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notificationAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { playNotificationSound } from '../utils/sound';

interface NotificationBellProps {
  onViewNotifications?: () => void;
}

export default function NotificationBell({ onViewNotifications }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [justArrived, setJustArrived] = useState(false);

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

      setJustArrived(true);
      setTimeout(() => setJustArrived(false), 1000);

      if (!incoming?.isLive || incoming._id) {
        setUnreadCount((c) => c + 1);
      }
    };

    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications();
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  return (
    <button
      onClick={onViewNotifications}
      className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${justArrived ? 'animate-bounce' : ''}`}
      aria-label="الإشعارات"
    >
      <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-yellow-500' : 'text-gray-600'}`} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
