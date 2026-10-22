import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  Trash2,
  ExternalLink,
  Flame,
  Bike,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useOrderNotification } from '../../context/OrderNotificationContext';
import { OrderStatus } from '../../types';

interface NotificationBellProps {
  onNavigate: (path: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    clearAllNotifications,
    triggerDemoNotification,
  } = useOrderNotification();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'Confirmed':
      case 'Accepted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'Preparing':
        return <Flame className="w-4 h-4 text-amber-600" />;
      case 'Ready':
      case 'Ready for Pickup':
        return <ShoppingBag className="w-4 h-4 text-indigo-600" />;
      case 'Picked Up':
      case 'Out for Delivery':
        return <Bike className="w-4 h-4 text-sky-600" />;
      case 'Delivered':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'Cancelled':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusBadgeStyle = (status: OrderStatus) => {
    switch (status) {
      case 'Confirmed':
      case 'Accepted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Preparing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Ready':
      case 'Ready for Pickup':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Picked Up':
      case 'Out for Delivery':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const handleNotificationClick = (orderId: string, notifId: string) => {
    markAsRead(notifId);
    setIsOpen(false);
    onNavigate(`/orders/${orderId}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="header-notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Order notifications"
        className={`relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all flex items-center justify-center ${
          isOpen
            ? 'bg-amber-100 text-amber-700'
            : 'text-slate-700 hover:text-amber-600 hover:bg-slate-100'
        }`}
      >
        <Bell className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />

        {/* Unread Badge Indicator */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-amber-500 text-[9px] sm:text-[10px] font-black text-slate-950 items-center justify-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div
          id="order-notifications-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Popover Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-sm text-white">Order Alerts</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-amber-500 text-slate-950 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs">
              {unreadCount > 0 && (
                <button
                  type="button"
                  id="notif-mark-all-read-btn"
                  onClick={markAllAsRead}
                  className="text-slate-300 hover:text-amber-400 font-semibold text-[11px] flex items-center space-x-1 transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  id="notif-delete-all-btn"
                  onClick={clearAllNotifications}
                  className="text-slate-400 hover:text-rose-400 font-semibold text-[11px] flex items-center space-x-1 transition px-1.5 py-0.5 rounded-lg hover:bg-slate-800"
                  title="Delete all customer notifications"
                  aria-label="Delete all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete all</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Demo Trigger banner for testing */}
          <div className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
            <span className="text-[11px] text-amber-900 font-medium flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
              <span>Test Status Alert:</span>
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => triggerDemoNotification('Preparing')}
                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-bold rounded-md shadow-xs transition"
              >
                🍳 Cooking
              </button>
              <button
                type="button"
                onClick={() => triggerDemoNotification('Out for Delivery')}
                className="px-2 py-0.5 bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold rounded-md shadow-xs transition"
              >
                🛵 Delivery
              </button>
              <button
                type="button"
                onClick={() => triggerDemoNotification('Delivered')}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md shadow-xs transition"
              >
                🍽️ Done
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">No order alerts</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  You have cleared all alerts. When your order status changes in real-time, new notifications will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.orderId, notif.id)}
                  className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start space-x-3 group relative ${
                    !notif.read ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0">
                    {getStatusIcon(notif.newStatus)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-slate-800">
                          #{notif.orderNumber}
                        </span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border uppercase tracking-wider ${getStatusBadgeStyle(
                            notif.newStatus
                          )}`}
                        >
                          {notif.newStatus}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatRelativeTime(notif.timestamp)}</span>
                        </span>
                        {/* Delete single notification option */}
                        <button
                          type="button"
                          id={`delete-notif-${notif.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Delete this notification"
                          aria-label={`Delete notification for order ${notif.orderNumber}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">
                      {notif.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-tight">
                      {notif.message}
                    </p>

                    {notif.deliveryPartnerName && (
                      <p className="text-[10px] text-sky-700 font-medium mt-1">
                        Rider: {notif.deliveryPartnerName}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Popover Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            {notifications.length > 0 ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="clear-all-notifs-btn"
                  onClick={clearAllNotifications}
                  className="text-slate-500 hover:text-rose-600 font-medium text-[11px] flex items-center space-x-1 transition"
                  title="Delete all notifications"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete all</span>
                </button>
                {notifications.some((n) => n.read) && (
                  <>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      id="clear-read-notifs-btn"
                      onClick={deleteReadNotifications}
                      className="text-slate-500 hover:text-rose-600 font-medium text-[11px] flex items-center space-x-1 transition"
                      title="Delete already read notifications"
                    >
                      <span>Delete read ({notifications.filter((n) => n.read).length})</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">Real-time alerts active</span>
            )}

            <button
              type="button"
              id="goto-all-orders-btn"
              onClick={() => {
                setIsOpen(false);
                onNavigate('/orders');
              }}
              className="text-amber-600 hover:text-amber-700 font-bold text-[11px] flex items-center space-x-1 transition ml-auto"
            >
              <span>View All Orders</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
