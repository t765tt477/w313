import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notificationAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { playNotificationSound } from '../utils/sound';

interface NotificationBellMobileProps {
  /** Whether the parent nav button is the currently active tab — used to match its color, just like every other bottom-nav icon. */
  active?: boolean;
}

export default function NotificationBellMobile({ active = false }: NotificationBellMobileProps) {
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

  // No <button>/onClick here on purpose: this renders inside the shared
  // bottom-nav <button>, so it only supplies the icon + unread badge and
  // inherits color/click behavior from that parent, same as every other tab.
  return (
    <span className="relative inline-flex">
      <Bell className={`w-5 h-5 ${active ? 'text-green-600' : 'text-yellow-600'} ${justArrived ? 'animate-bounce' : ''}`} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </span>
  );
}
