import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Flame,
  Bike,
  ShoppingBag,
  ArrowRight,
  X,
  Bell,
  Utensils,
  Clock,
} from 'lucide-react';
import { useOrderNotification } from '../../context/OrderNotificationContext';
import { OrderStatus } from '../../types';

interface OrderStatusToastProps {
  onNavigate: (path: string) => void;
}

export const OrderStatusToast: React.FC<OrderStatusToastProps> = ({ onNavigate }) => {
  const { activeToast, dismissToast, markAsRead } = useOrderNotification();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!activeToast) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const duration = 7500;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return Math.max(0, prev - step);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  const getStatusBadgeConfig = (status: OrderStatus) => {
    switch (status) {
      case 'Confirmed':
      case 'Accepted':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          accent: 'bg-emerald-500',
          badgeText: 'Confirmed',
          headerBg: 'from-emerald-500/10 to-transparent',
        };
      case 'Preparing':
        return {
          icon: Flame,
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          accent: 'bg-amber-500',
          badgeText: 'In Kitchen',
          headerBg: 'from-amber-500/10 to-transparent',
        };
      case 'Ready':
      case 'Ready for Pickup':
        return {
          icon: ShoppingBag,
          color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          accent: 'bg-indigo-500',
          badgeText: 'Ready',
          headerBg: 'from-indigo-500/10 to-transparent',
        };
      case 'Picked Up':
      case 'Out for Delivery':
        return {
          icon: Bike,
          color: 'text-sky-700 bg-sky-50 border-sky-200',
          accent: 'bg-sky-500',
          badgeText: 'On the Way',
          headerBg: 'from-sky-500/10 to-transparent',
        };
      case 'Delivered':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
          accent: 'bg-emerald-600',
          badgeText: 'Delivered',
          headerBg: 'from-emerald-600/15 to-transparent',
        };
      case 'Cancelled':
        return {
          icon: AlertCircle,
          color: 'text-rose-700 bg-rose-50 border-rose-200',
          accent: 'bg-rose-500',
          badgeText: 'Cancelled',
          headerBg: 'from-rose-500/10 to-transparent',
        };
      default:
        return {
          icon: Bell,
          color: 'text-slate-700 bg-slate-100 border-slate-200',
          accent: 'bg-amber-500',
          badgeText: 'Order Update',
          headerBg: 'from-amber-500/10 to-transparent',
        };
    }
  };

  const config = getStatusBadgeConfig(activeToast.newStatus);
  const StatusIcon = config.icon;

  const handleViewOrder = () => {
    markAsRead(activeToast.id);
    dismissToast(activeToast.id);
    onNavigate(`/orders/${activeToast.orderId}`);
  };

  return (
    <aside
      aria-label="Order status alert"
      id="order-status-visual-toast"
      className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-full transition-all duration-300 transform translate-y-0"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden ring-1 ring-slate-900/5 backdrop-blur-md">
        {/* Progress Bar Header */}
        <div className="w-full bg-slate-100 h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${config.accent}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card Body */}
        <div className={`p-4 bg-gradient-to-b ${config.headerBg}`}>
          <div className="flex items-start space-x-3.5">
            {/* Animated Status Icon */}
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${config.color} shadow-xs relative`}
            >
              <StatusIcon className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.accent}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.accent}`} />
              </span>
            </div>

            {/* Content info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-black text-slate-800 tracking-wider">
                    #{activeToast.orderNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${config.color}`}
                  >
                    {config.badgeText}
                  </span>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  id="toast-dismiss-button"
                  onClick={() => dismissToast(activeToast.id)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Message */}
              <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                {activeToast.title}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {activeToast.message}
              </p>

              {/* Delivery Boy Tag if assigned */}
              {activeToast.deliveryPartnerName && (
                <div className="mt-2 text-[11px] text-sky-800 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100 flex items-center space-x-1.5">
                  <Bike className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>
                    Rider: <strong className="font-bold">{activeToast.deliveryPartnerName}</strong>
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-600 font-medium flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span>Just now</span>
                </span>

                <button
                  type="button"
                  id="toast-track-order-btn"
                  onClick={handleViewOrder}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-amber-600 text-white hover:text-white text-xs font-bold rounded-xl transition shadow-xs group"
                >
                  <span>Track Live Order</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
