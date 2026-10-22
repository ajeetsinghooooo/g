import React, { useState, useEffect } from 'react';
import {
  Clock,
  ArrowRight,
  Package,
  RotateCcw,
  Bike,
  Store,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Order, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useOrderNotification } from '../context/OrderNotificationContext';
import { safeJson, apiFetch } from '../utils/api';

interface OrdersViewProps {
  onNavigate: (path: string) => void;
  onSelectOrder: (orderId: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onNavigate, onSelectOrder }) => {
  const { customerToken } = useAuth();
  const { addToCart } = useCart();
  const { latestUpdatedOrder } = useOrderNotification();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await apiFetch('/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      if (res.ok) {
        const data = await safeJson(res).catch(() => null);
        if (Array.isArray(data)) {
          setOrders(data);
        }
      }
    } catch (err) {
      console.warn('Failed to load user orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [customerToken]);

  // Sync immediately when live status notification is received
  useEffect(() => {
    if (latestUpdatedOrder) {
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === latestUpdatedOrder.id);
        if (exists) {
          return prev.map((o) => (o.id === latestUpdatedOrder.id ? latestUpdatedOrder : o));
        }
        return [latestUpdatedOrder, ...prev];
      });
    }
  }, [latestUpdatedOrder]);

  const handleReorder = async (order: Order) => {
    // Fetch products to recreate cart items
    try {
      const res = await apiFetch('/api/products');
      const allProducts: Product[] = await safeJson(res).catch(() => []);

      order.items.forEach((item) => {
        const prod = allProducts.find((p) => p.id === item.productId);
        if (prod) {
          addToCart(prod, item.quantity, item.selectedAddons, item.specialInstructions);
        } else {
          // Product item details
          addToCart(
            {
              id: item.productId,
              name: item.name,
              price: item.price,
              description: '',
              category: 'Main Course',
              image: '',
              isVeg: true,
              isAvailable: true,
            },
            item.quantity,
            item.selectedAddons,
            item.specialInstructions
          );
        }
      });

      setReorderedId(order.id);
      setTimeout(() => {
        setReorderedId(null);
        onNavigate('/cart');
      }, 700);
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Retrieving your order history...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto border border-amber-200">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">No Orders Placed Yet</h2>
        <p className="text-xs text-slate-500">
          You haven't ordered from Kitchen Cruze yet. Ready to experience our freshly prepared food?
        </p>
        <button
          onClick={() => onNavigate('/menu')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          Explore Menu &amp; Order
        </button>
      </div>
    );
  }

  return (
    <div id="customer-orders-view" className="max-w-3xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Your Order History</h1>
        <p className="text-xs text-slate-500">
          Track active food orders or repeat your favorite meals with one click.
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const isDelivered = order.status === 'Delivered' || order.status === 'Picked Up';
          const isCancelled = order.status === 'Cancelled';
          const isActive = !isDelivered && !isCancelled;

          return (
            <div
              key={order.id}
              id={`order-item-${order.id}`}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                    #{order.id}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Status Badge */}
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : isDelivered
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isActive && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                  <span>{order.status}</span>
                </span>
              </div>

              {/* Items summary */}
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    {order.orderType === 'Delivery' ? (
                      <span className="flex items-center space-x-1 text-slate-700 font-semibold">
                        <Bike className="w-3.5 h-3.5 text-amber-600" />
                        <span>Home Delivery</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-slate-700 font-semibold">
                        <Store className="w-3.5 h-3.5 text-amber-600" />
                        <span>Self Pickup</span>
                      </span>
                    )}
                    <span>•</span>
                    <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium line-clamp-1">
                    {order.items.map((it) => `${it.name} (${it.quantity})`).join(', ')}
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-xs text-slate-400 block">Total Paid</span>
                  <span className="text-base font-extrabold text-slate-900">₹{order.grandTotal}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  id={`order-track-btn-${order.id}`}
                  onClick={() => onSelectOrder(order.id)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center space-x-1.5"
                >
                  <span>{isActive ? 'Track Live Order' : 'View Full Receipt'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  id={`order-reorder-btn-${order.id}`}
                  onClick={() => handleReorder(order)}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
                >
                  {reorderedId === order.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Items Added to Cart!</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Reorder Meal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
