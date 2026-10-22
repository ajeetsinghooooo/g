import React, { useState, useEffect, useCallback } from 'react';
import {
  Bike,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Navigation,
  RefreshCw,
  LogOut,
  Package,
  ArrowRight,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import { KitchenCruzeLogo } from '../components/KitchenCruzeLogo';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Order, DeliveryStatus, CodStatus } from '../types';

interface DeliveryDashboardViewProps {
  onNavigate: (path: string) => void;
}

export const DeliveryDashboardView: React.FC<DeliveryDashboardViewProps> = ({ onNavigate }) => {
  const { staffUser, staffToken, logoutStaff } = useAuth();
  const { settings } = useSettings();

  const [orders, setOrders] = useState<Order[]>([]);
  const [profileData, setProfileData] = useState<{
    deliveryBoy?: any;
    stats?: { totalDelivered: number; totalDistanceKm: number; pendingDeliveries: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!staffToken) return;
    try {
      const res = await fetch('/api/delivery/profile', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  }, [staffToken]);

  const fetchOrders = useCallback(async () => {
    if (!staffToken) return;
    try {
      const res = await fetch('/api/delivery/orders', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch delivery orders:', err);
    } finally {
      setLoading(false);
    }
  }, [staffToken]);

  useEffect(() => {
    fetchOrders();
    fetchProfile();

    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('ORDER_UPDATE', (e) => {
      try {
        const updated = JSON.parse(e.data);
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === updated.id);
          if (exists) {
            return prev.map((o) => (o.id === updated.id ? updated : o));
          }
          return [updated, ...prev];
        });
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('NEW_ORDER', (e) => {
      try {
        const newOrder = JSON.parse(e.data);
        if (newOrder.orderType === 'Delivery') {
          setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
        }
      } catch (err) {}
    });

    return () => {
      eventSource.close();
    };
  }, [fetchOrders]);

  const handleUpdateDeliveryStatus = async (orderId: string, deliveryStatus: DeliveryStatus) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ deliveryStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateCodStatus = async (orderId: string, codStatus: CodStatus) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}/cod`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ codStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = () => {
    logoutStaff();
    onNavigate('/delivery-login');
  };

  // Calculate COD Cash in hand that has been received from customer but not yet handed over
  const cashInHand = orders
    .filter((o) => o.paymentMethod === 'Cash on Delivery' && o.codStatus === 'Cash Received')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return o.status !== 'Delivered' && o.status !== 'Cancelled';
    if (filter === 'completed') return o.status === 'Delivered';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-3">
          <KitchenCruzeLogo variant="light" size="md" customLogoUrl={settings.logo} onClick={() => onNavigate('/')} />
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-400">
            <Bike className="w-3.5 h-3.5" />
            <span>Delivery Partner Dispatch</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchOrders}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs flex items-center space-x-1 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:inline">Sync</span>
          </button>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white flex items-center space-x-1.5 justify-end">
              {profileData?.deliveryBoy?.deliveryBoyNumber && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-black">
                  #{profileData.deliveryBoy.deliveryBoyNumber}
                </span>
              )}
              <span>{staffUser?.name || 'Delivery Partner'}</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">{staffUser?.username || 'Delivery Agent'}</div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs flex items-center space-x-1 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Metric Cards Header */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-600/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">COD Cash In Hand</div>
              <div className="text-2xl font-black text-white mt-1">₹{cashInHand}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Pending handover</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Deliveries</div>
              <div className="text-2xl font-black text-white mt-1">
                {orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length}
              </div>
              <div className="text-[11px] text-amber-400 mt-0.5">Orders on the road</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completed Deliveries</div>
              <div className="text-2xl font-black text-white mt-1">
                {profileData?.stats?.totalDelivered ?? orders.filter((o) => o.status === 'Delivered').length}
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5">Successful drop-offs</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Distance</div>
              <div className="text-2xl font-black text-purple-400 mt-1">
                {profileData?.stats?.totalDistanceKm ??
                  Math.round(
                    orders
                      .filter((o) => o.status === 'Delivered')
                      .reduce((sum, o) => sum + (o.deliveryDistanceKm || 0), 0) * 10
                  ) / 10}{' '}
                KM
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Delivered trips only</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2 mt-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === 'active'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Active Deliveries
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Completed Orders
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === 'all'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            All Orders ({orders.length})
          </button>
        </div>
      </div>

      {/* Main List */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading delivery manifest...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Bike className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Orders in this View</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              New deliveries assigned to your rider profile will appear here with customer directions and COD status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOrders.map((order) => {
              const isCOD = order.paymentMethod === 'Cash on Delivery';
              const isDelivered = order.status === 'Delivered';
              const isOutForDelivery = order.status === 'Out for Delivery';
              const isPickedUp = order.deliveryStatus === 'Picked Up' || isOutForDelivery;

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xl ${
                    isDelivered
                      ? 'border-slate-800 opacity-90'
                      : isOutForDelivery
                      ? 'border-emerald-500/60 ring-2 ring-emerald-500/20'
                      : 'border-amber-500/40'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-base font-black text-emerald-400">{order.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {order.orderType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Placed at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          isDelivered
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isOutForDelivery
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer and Address Information */}
                  <div className="p-4 space-y-4 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{order.customerName}</div>
                        <div className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{order.customerPhone}</span>
                        </div>
                      </div>

                      {order.customerPhone && (
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition border border-emerald-600/30"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>

                    {order.deliveryAddress ? (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                        <div className="flex items-start space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-white">Delivery Address: </span>
                            <span>
                              {order.deliveryAddress.streetAddress ||
                                order.deliveryAddress.street ||
                                order.deliveryAddress.house ||
                                ''}
                              {order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}
                            </span>
                            {order.deliveryAddress.landmark && (
                              <div className="text-slate-400 text-[11px] mt-0.5">
                                Landmark: {order.deliveryAddress.landmark}
                              </div>
                            )}
                            {order.deliveryAddress.pincode && (
                              <div className="text-slate-400 text-[11px]">
                                PIN: {order.deliveryAddress.pincode}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Calculated Distance from Restaurant */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-[11px]">
                              <Compass className="w-3 h-3" />
                              <span>
                                Distance:{' '}
                                {order.deliveryDistanceDisplay ||
                                  (order.deliveryDistanceKm
                                    ? `${order.deliveryDistanceKm} KM`
                                    : '2.0 KM')}
                              </span>
                            </span>
                            {order.deliveryRadiusAtOrder && (
                              <span className="text-[10px] text-slate-500">
                                (Radius: {order.deliveryRadiusAtOrder} KM)
                              </span>
                            )}
                          </div>

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=${
                              order.restaurantLatitude || settings.location?.latitude || 19.076
                            },${
                              order.restaurantLongitude || settings.location?.longitude || 72.8777
                            }&destination=${
                              order.customerLatitude && order.customerLongitude
                                ? `${order.customerLatitude},${order.customerLongitude}`
                                : encodeURIComponent(
                                    `${order.deliveryAddress.streetAddress || order.deliveryAddress.street || order.deliveryAddress.house || ''}, ${order.deliveryAddress.city || ''}`
                                  )
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 transition"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Navigate (Directions)</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">Dine-in / Takeaway Order</div>
                    )}

                    {/* Order summary */}
                    <div className="text-xs text-slate-400 space-y-1">
                      <div className="font-bold text-slate-300">Items:</div>
                      {order.items.map((it, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{it.quantity}x {it.name}</span>
                          <span className="text-slate-300">₹{it.price * it.quantity}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white">
                        <span>Total to Collect / Paid:</span>
                        <span className="text-emerald-400 text-sm">₹{order.grandTotal}</span>
                      </div>
                    </div>

                    {/* COD Section */}
                    {isCOD && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-amber-400 flex items-center space-x-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Cash on Delivery (₹{order.grandTotal})</span>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            {order.codStatus || 'Pending Collection'}
                          </span>
                        </div>

                        {/* Actions for COD */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button
                            onClick={() => handleUpdateCodStatus(order.id, 'Cash Received')}
                            disabled={actionLoadingId === order.id || order.codStatus === 'Cash Received' || order.codStatus === 'Cash Handed Over' || order.codStatus === 'Handed Over'}
                            className={`py-2 px-2 text-[11px] font-bold rounded-lg transition ${
                              order.codStatus === 'Cash Received' || order.codStatus === 'Cash Handed Over' || order.codStatus === 'Handed Over'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm'
                            }`}
                          >
                            {order.codStatus === 'Cash Received' ? '✓ Cash Received' : 'Cash Received'}
                          </button>

                          <button
                            onClick={() => handleUpdateCodStatus(order.id, 'Cash Handed Over')}
                            disabled={actionLoadingId === order.id || order.codStatus === 'Cash Handed Over' || order.codStatus === 'Handed Over' || order.codStatus !== 'Cash Received'}
                            className={`py-2 px-2 text-[11px] font-bold rounded-lg transition ${
                              order.codStatus === 'Cash Handed Over' || order.codStatus === 'Handed Over'
                                ? 'bg-slate-800 text-slate-500'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                          >
                            {order.codStatus === 'Cash Handed Over' || order.codStatus === 'Handed Over' ? '✓ Handed Over' : 'Hand Over to Cafe'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Lifecycle Actions */}
                  <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 space-y-2">
                    {!isDelivered && (
                      <div className="grid grid-cols-2 gap-2">
                        {!isPickedUp ? (
                          <button
                            onClick={() => handleUpdateDeliveryStatus(order.id, 'Picked Up')}
                            disabled={actionLoadingId === order.id}
                            className="col-span-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                          >
                            <Package className="w-4 h-4" />
                            <span>Pick Up Food From Kitchen</span>
                          </button>
                        ) : !isOutForDelivery ? (
                          <button
                            onClick={() => handleUpdateDeliveryStatus(order.id, 'Out for Delivery')}
                            disabled={actionLoadingId === order.id}
                            className="col-span-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                          >
                            <Bike className="w-4 h-4" />
                            <span>Start Delivery Run (Out for Delivery)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateDeliveryStatus(order.id, 'Delivered')}
                            disabled={actionLoadingId === order.id}
                            className="col-span-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark Order Delivered to Customer</span>
                          </button>
                        )}
                      </div>
                    )}

                    {isDelivered && (
                      <div className="text-center py-1 text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Order Successfully Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
