import React, { useState, useEffect, useCallback } from 'react';
import {
  Utensils,
  Clock,
  CheckCircle2,
  Flame,
  Bell,
  RefreshCw,
  LogOut,
  AlertCircle,
  PackageCheck,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { KitchenCruzeLogo } from '../components/KitchenCruzeLogo';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Order, ChefStatus } from '../types';

interface ChefDashboardViewProps {
  onNavigate: (path: string) => void;
}

export const ChefDashboardView: React.FC<ChefDashboardViewProps> = ({ onNavigate }) => {
  const { staffUser, staffToken, logoutStaff } = useAuth();
  const { settings } = useSettings();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Placed' | 'Accepted' | 'Preparing' | 'Ready'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!staffToken) return;
    try {
      const res = await fetch('/api/chef/orders', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch chef orders:', err);
    } finally {
      setLoading(false);
    }
  }, [staffToken]);

  useEffect(() => {
    fetchOrders();

    // Listen to real-time events for kitchen
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('NEW_ORDER', (e) => {
      try {
        const newOrder = JSON.parse(e.data);
        setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
        setNotificationMsg(`🔥 New Order Received: ${newOrder.id}`);
        // Audio tone notification
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(650, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        } catch {}
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('ORDER_UPDATE', (e) => {
      try {
        const updated = JSON.parse(e.data);
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      } catch (err) {
        console.error(err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, nextStatus: ChefStatus) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/chef/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ chefStatus: nextStatus }),
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
    onNavigate('/chef-login');
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'Placed') return o.status === 'Placed' || o.chefStatus === 'Pending';
    if (filter === 'Accepted') return o.chefStatus === 'Accepted';
    if (filter === 'Preparing') return o.chefStatus === 'Preparing';
    if (filter === 'Ready') return o.chefStatus === 'Ready';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Kitchen Station Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-4">
          <KitchenCruzeLogo variant="light" size="md" customLogoUrl={settings.logo} onClick={() => onNavigate('/')} />
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-400">
            <Utensils className="w-3.5 h-3.5" />
            <span>Chef / Kitchen Display Station</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchOrders}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs flex items-center space-x-1.5 transition"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{staffUser?.name || 'Chef Station'}</div>
            <div className="text-[10px] text-amber-400 uppercase tracking-wide">Live Orders Queue</div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs flex items-center space-x-1.5 transition"
            title="Log Out Chef"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Real-time notification banner */}
      {notificationMsg && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 animate-bounce" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-950 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 pb-2">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              filter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>All Active Orders</span>
            <span className="bg-slate-950/20 px-1.5 py-0.2 rounded-full text-[10px]">{orders.length}</span>
          </button>

          <button
            onClick={() => setFilter('Placed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              filter === 'Placed'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>New Placed</span>
            <span className="bg-slate-950/20 px-1.5 py-0.2 rounded-full text-[10px]">
              {orders.filter((o) => o.status === 'Placed' || o.chefStatus === 'Pending').length}
            </span>
          </button>

          <button
            onClick={() => setFilter('Accepted')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              filter === 'Accepted'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Accepted</span>
            <span className="bg-slate-950/20 px-1.5 py-0.2 rounded-full text-[10px]">
              {orders.filter((o) => o.chefStatus === 'Accepted').length}
            </span>
          </button>

          <button
            onClick={() => setFilter('Preparing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              filter === 'Preparing'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>In Kitchen (Cooking)</span>
            <span className="bg-slate-950/20 px-1.5 py-0.2 rounded-full text-[10px]">
              {orders.filter((o) => o.chefStatus === 'Preparing').length}
            </span>
          </button>

          <button
            onClick={() => setFilter('Ready')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              filter === 'Ready'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Ready for Handover</span>
            <span className="bg-slate-950/20 px-1.5 py-0.2 rounded-full text-[10px]">
              {orders.filter((o) => o.chefStatus === 'Ready').length}
            </span>
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Syncing kitchen order queue...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-slate-800 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Orders in Kitchen Queue</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When customers place food orders on Kitchen Cruze, tickets will automatically appear here in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              const isPlaced = order.status === 'Placed' || order.chefStatus === 'Pending';
              const isAccepted = order.chefStatus === 'Accepted';
              const isPreparing = order.chefStatus === 'Preparing';
              const isReady = order.chefStatus === 'Ready';

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xl ${
                    isPlaced
                      ? 'border-red-500/60 ring-2 ring-red-500/20'
                      : isPreparing
                      ? 'border-amber-500/60'
                      : isReady
                      ? 'border-emerald-500/60'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-base font-black text-amber-400">{order.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {order.orderType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          isPlaced
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                            : isAccepted
                            ? 'bg-blue-500/20 text-blue-400'
                            : isPreparing
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {order.chefStatus || order.status}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 flex-1 space-y-3">
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between text-sm py-1 border-b border-slate-800/40 last:border-0">
                          <div className="flex items-start space-x-2">
                            <span className="font-bold text-amber-400 min-w-[20px]">{item.quantity}x</span>
                            <div>
                              <div className="font-semibold text-white flex items-center space-x-1.5">
                                {item.isVeg !== undefined && (
                                  <div
                                    className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 ${
                                      item.isVeg ? 'border-emerald-500' : 'border-rose-500'
                                    }`}
                                    title={item.isVeg ? 'Pure Veg' : 'Non-Veg'}
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                      }`}
                                    />
                                  </div>
                                )}
                                <span>{item.name}</span>
                              </div>
                              {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <div className="text-xs text-slate-400">
                                  + {item.selectedAddons.map((a) => a.name).join(', ')}
                                </div>
                              )}
                              {item.specialInstructions && (
                                <div className="text-xs text-amber-300/90 italic mt-0.5 flex items-center space-x-1">
                                  <Info className="w-3 h-3 shrink-0" />
                                  <span>&ldquo;{item.specialInstructions}&rdquo;</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.specialInstructions && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300">
                        <span className="font-bold text-slate-400 block mb-0.5">Special Order Note:</span>
                        {order.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 space-y-2">
                    {isPlaced && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Accepted')}
                        disabled={actionLoadingId === order.id}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept &amp; Send to Kitchen</span>
                      </button>
                    )}

                    {isAccepted && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                        disabled={actionLoadingId === order.id}
                        className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                      >
                        <Flame className="w-4 h-4" />
                        <span>Start Cooking Dish</span>
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Ready')}
                        disabled={actionLoadingId === order.id}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Mark Ready for Pickup / Delivery</span>
                      </button>
                    )}

                    {isReady && (
                      <div className="text-center py-1 text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready at Kitchen Counter</span>
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
