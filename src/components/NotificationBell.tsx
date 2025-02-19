import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { Notification } from '../types/notification';
import NotificationList from './NotificationList';

interface NotificationBellProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onNotificationClick,
  onMarkAllRead,
}) => {
  const [isShaking, setIsShaking] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const hasUnreadNotifications = notifications.some(n => !n.read);

  useEffect(() => {
    let shakeInterval: NodeJS.Timeout;

    if (hasUnreadNotifications) {
      // Initial shake
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 1000);

      // Set up interval for shaking every 10 seconds
      shakeInterval = setInterval(() => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 1000);
      }, 10000);
    }

    return () => {
      if (shakeInterval) {
        clearInterval(shakeInterval);
      }
    };
  }, [hasUnreadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (hasUnreadNotifications) {
      onMarkAllRead();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick(notification);
    setShowNotifications(false);
  };

  return (
    <div className="relative" ref={bellRef}>
      <div className="relative cursor-pointer" onClick={handleBellClick}>
        <BellIcon 
          className={`h-6 w-6 text-gray-600 dark:text-gray-300 transition-transform ${
            isShaking ? 'animate-shake' : ''
          }`}
        />
        {hasUnreadNotifications && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
        )}
      </div>

      {showNotifications && (
        <NotificationList
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
