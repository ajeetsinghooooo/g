import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Order, OrderStatus } from '../types';
import { useAuth } from './AuthContext';
import { playOrderStatusChime } from '../utils/notificationSound';
import { safeJson, apiFetch } from '../utils/api';

export interface OrderStatusNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  previousStatus?: OrderStatus;
  newStatus: OrderStatus;
  orderType: 'Delivery' | 'Pickup';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderTotal?: number;
  itemCount?: number;
  deliveryPartnerName?: string;
}

interface OrderNotificationContextType {
  notifications: OrderStatusNotification[];
  unreadCount: number;
  activeToast: OrderStatusNotification | null;
  dismissToast: (id?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  deleteReadNotifications: () => void;
  clearAllNotifications: () => void;
  latestUpdatedOrder: Order | null;
  triggerDemoNotification: (customStatus?: OrderStatus) => void;
}

const OrderNotificationContext = createContext<OrderNotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'kitchen_cruze_order_notifications';

export const OrderNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { customerToken, customer, isCustomerAuthenticated } = useAuth();

  // Notification history persisted in localStorage
  const [notifications, setNotifications] = useState<OrderStatusNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Current active popup toast alert
  const [activeToast, setActiveToast] = useState<OrderStatusNotification | null>(null);
  const [latestUpdatedOrder, setLatestUpdatedOrder] = useState<Order | null>(null);

  // Map of last known statuses: orderId -> OrderStatus
  const knownStatusesRef = useRef<{ [orderId: string]: OrderStatus }>({});
  const isInitialFetchRef = useRef(true);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 30)));
    } catch (e) {
      console.warn('Failed to persist notifications:', e);
    }
  }, [notifications]);

  // Generate clear, customer-friendly status headlines & descriptions
  const getStatusNotificationContent = (
    status: OrderStatus,
    orderType: 'Delivery' | 'Pickup',
    deliveryPartner?: string
  ): { title: string; message: string } => {
    switch (status) {
      case 'Confirmed':
      case 'Accepted':
        return {
          title: 'Order Confirmed! 🎉',
          message: 'Kitchen Cruze has confirmed your order. It is queued for cooking.',
        };
      case 'Preparing':
        return {
          title: 'Cooking in the Kitchen 🍳',
          message: 'Chef has started preparing your fresh and hot dishes!',
        };
      case 'Ready':
        return {
          title: 'Food Cooked & Packed 📦',
          message: orderType === 'Pickup'
            ? 'Your order is ready at the pickup counter!'
            : 'Your order is packed and awaiting delivery partner pickup.',
        };
      case 'Ready for Pickup':
        return {
          title: 'Ready for Pickup! 🛍️',
          message: 'Your hot meal is freshly packed and waiting for you at the counter!',
        };
      case 'Picked Up':
        return {
          title: orderType === 'Pickup' ? 'Order Picked Up! 😋' : 'Dispatched with Partner 🛵',
          message: orderType === 'Pickup'
            ? 'Enjoy your delicious meal from Kitchen Cruze!'
            : 'Delivery partner has collected your food from the kitchen.',
        };
      case 'Out for Delivery':
        return {
          title: 'Out for Delivery! 🛵💨',
          message: deliveryPartner
            ? `${deliveryPartner} is on the way to your address with your meal!`
            : 'Your food is on the way! Delivery partner is heading your way.',
        };
      case 'Delivered':
        return {
          title: 'Order Delivered! 🍽️✨',
          message: 'Your order has been safely delivered. Bon appétit!',
        };
      case 'Cancelled':
        return {
          title: 'Order Cancelled ⚠️',
          message: 'This order was cancelled. Please check your order details.',
        };
      case 'Order Received':
      case 'Placed':
      default:
        return {
          title: 'Order Placed Successfully',
          message: 'Your order is received and will be confirmed shortly.',
        };
    }
  };

  // Helper to trigger a new notification
  const triggerNotification = useCallback((
    order: Order,
    prevStatus?: OrderStatus
  ) => {
    const content = getStatusNotificationContent(
      order.status,
      order.orderType,
      order.assignedDeliveryBoyName
    );

    const newNotification: OrderStatusNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      orderNumber: order.id.slice(-6).toUpperCase(),
      previousStatus: prevStatus,
      newStatus: order.status,
      orderType: order.orderType,
      title: content.title,
      message: content.message,
      timestamp: new Date().toISOString(),
      read: false,
      orderTotal: order.grandTotal,
      itemCount: order.items?.reduce((acc, it) => acc + it.quantity, 0) || order.items?.length || 1,
      deliveryPartnerName: order.assignedDeliveryBoyName,
    };

    // Play subtle audio alert
    playOrderStatusChime(order.status);

    // Update notifications list
    setNotifications((prev) => [newNotification, ...prev]);

    // Show visual popup toast
    setActiveToast(newNotification);
    setLatestUpdatedOrder(order);

    // Auto-dismiss toast after 7.5 seconds
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast((current) => (current?.id === newNotification.id ? null : current));
    }, 7500);
  }, []);

  // Dismiss toast
  const dismissToast = useCallback((id?: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActiveToast((current) => {
      if (!id || current?.id === id) {
        return null;
      }
      return current;
    });
  }, []);

  // Mark single as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Delete a specific customer notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setActiveToast((current) => (current?.id === id ? null : current));
  }, []);

  // Delete all read customer notifications
  const deleteReadNotifications = useCallback(() => {
    setNotifications((prev) => prev.filter((n) => !n.read));
  }, []);

  // Clear all
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setActiveToast(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  // Check orders and compare statuses against database
  const checkCustomerOrders = useCallback(async () => {
    if (!customerToken) return;

    try {
      const res = await apiFetch('/api/customer/orders', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      if (!res.ok) return;

      const currentOrders: Order[] = await safeJson(res).catch(() => []);
      if (!Array.isArray(currentOrders)) return;

      // On initial load, just record the existing statuses without spamming notifications
      if (isInitialFetchRef.current) {
        currentOrders.forEach((o) => {
          knownStatusesRef.current[o.id] = o.status;
        });
        isInitialFetchRef.current = false;
        return;
      }

      // Detect status changes in the database
      currentOrders.forEach((order) => {
        const prevStatus = knownStatusesRef.current[order.id];

        if (prevStatus && prevStatus !== order.status) {
          // Status has changed! Trigger alert
          triggerNotification(order, prevStatus);
        }

        // Update known status in cache
        knownStatusesRef.current[order.id] = order.status;
      });
    } catch (err) {
      // Silently retry next cycle
    }
  }, [customerToken, triggerNotification]);

  // Initial fetch and periodic polling (every 5 seconds) to ensure database changes are caught reliably
  useEffect(() => {
    if (!isCustomerAuthenticated || !customerToken) {
      isInitialFetchRef.current = true;
      knownStatusesRef.current = {};
      return;
    }

    checkCustomerOrders();

    const interval = setInterval(() => {
      checkCustomerOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, [isCustomerAuthenticated, customerToken, checkCustomerOrders]);

  // Real-time SSE listener for instant zero-latency push updates
  useEffect(() => {
    if (!isCustomerAuthenticated) return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/events');

      const handleOrderUpdate = (event: MessageEvent) => {
        try {
          const updatedOrder: Order = JSON.parse(event.data);
          if (!updatedOrder || !updatedOrder.id) return;

          // Check if this order belongs to this customer
          if (customer?.id && updatedOrder.customerId === customer.id) {
            const prevStatus = knownStatusesRef.current[updatedOrder.id];

            if (prevStatus !== updatedOrder.status) {
              triggerNotification(updatedOrder, prevStatus);
              knownStatusesRef.current[updatedOrder.id] = updatedOrder.status;
            }
          }
        } catch {
          // Parse error ignore
        }
      };

      eventSource.addEventListener('ORDER_UPDATE', handleOrderUpdate);
      eventSource.addEventListener('CHEF_UPDATE', handleOrderUpdate);
      eventSource.addEventListener('DELIVERY_UPDATE', handleOrderUpdate);
      eventSource.addEventListener('ORDER_ASSIGNED', handleOrderUpdate);
      eventSource.addEventListener('PAYMENT_VERIFIED', handleOrderUpdate);
    } catch {
      // Fallback to polling
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isCustomerAuthenticated, customer?.id, triggerNotification]);

  // Helper for users/reviewers to preview and test the visual alert system
  const triggerDemoNotification = useCallback((customStatus?: OrderStatus) => {
    const statuses: OrderStatus[] = [
      'Confirmed',
      'Preparing',
      'Out for Delivery',
      'Delivered',
    ];
    const targetStatus = customStatus || statuses[Math.floor(Math.random() * statuses.length)];

    const demoOrder: Order = {
      id: `kc-${Date.now().toString().slice(-4)}`,
      customerId: customer?.id || 'demo-user',
      customerName: customer?.fullName || 'Valued Customer',
      customerPhone: '9876543210',
      customerEmail: 'customer@kitchencruze.com',
      customer: {
        fullName: customer?.fullName || 'Valued Customer',
        phone: '9876543210',
      },
      orderType: 'Delivery',
      items: [
        {
          productId: 'prod-1',
          name: 'Butter Chicken Special',
          price: 349,
          quantity: 2,
          itemTotal: 698,
        },
      ],
      subtotal: 698,
      discount: 50,
      gstRate: 5,
      gstAmount: 32.4,
      packagingCharge: 25,
      deliveryCharge: 0,
      weightCharge: 0,
      grandTotal: 705.4,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending',
      status: targetStatus,
      chefStatus: 'Preparing',
      deliveryStatus: targetStatus === 'Out for Delivery' ? 'Out for Delivery' : 'Unassigned',
      assignedDeliveryBoyName: 'Rahul Sharma',
      codStatus: 'Pending Collection',
      statusHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    triggerNotification(demoOrder, 'Placed');
  }, [customer, triggerNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <OrderNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteReadNotifications,
        clearAllNotifications,
        latestUpdatedOrder,
        triggerDemoNotification,
      }}
    >
      {children}
    </OrderNotificationContext.Provider>
  );
};

export const useOrderNotification = () => {
  const context = useContext(OrderNotificationContext);
  if (!context) {
    throw new Error('useOrderNotification must be used within an OrderNotificationProvider');
  }
  return context;
};
