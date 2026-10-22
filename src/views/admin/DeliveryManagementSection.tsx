import React, { useState, useEffect, useCallback } from 'react';
import {
  Bike,
  MapPin,
  Compass,
  Users,
  CheckCircle2,
  AlertCircle,
  Key,
  RefreshCw,
  Search,
  Plus,
  Power,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  User,
  X,
  Lock,
  Trash2,
} from 'lucide-react';
import { DeliveryBoy, Order, RestaurantSettings } from '../../types';

interface DeliveryManagementSectionProps {
  adminToken: string;
  settings: RestaurantSettings;
  onSettingsUpdated: (newSettings: RestaurantSettings) => void;
  orders: Order[];
  onOrderUpdated?: (order: Order) => void;
}

export const DeliveryManagementSection: React.FC<DeliveryManagementSectionProps> = ({
  adminToken,
  settings,
  onSettingsUpdated,
  orders,
  onOrderUpdated,
}) => {
  // --------------------------------------------------------------------------
  // RESTAURANT LOCATION & DELIVERY RADIUS STATE
  // --------------------------------------------------------------------------
  const [lat, setLat] = useState<number>(settings.location?.latitude ?? 19.0760);
  const [lng, setLng] = useState<number>(settings.location?.longitude ?? 72.8777);
  const [address, setAddress] = useState<string>(
    settings.location?.address || settings.address || 'Shop 14, Cruze Promenade, Near City Center, Mumbai, 400050'
  );
  const [city, setCity] = useState<string>(settings.location?.city || 'Mumbai');
  const [pincode, setPincode] = useState<string>(settings.location?.pincode || '400050');
  const [radiusKm, setRadiusKm] = useState<number>(settings.deliveryRadiusKm || 5);
  const [customRadius, setCustomRadius] = useState<string>('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  // Sync state if settings prop changes
  useEffect(() => {
    if (settings.location?.latitude) setLat(settings.location.latitude);
    if (settings.location?.longitude) setLng(settings.location.longitude);
    if (settings.location?.address) setAddress(settings.location.address);
    if (settings.location?.city) setCity(settings.location.city);
    if (settings.location?.pincode) setPincode(settings.location.pincode);
    if (settings.deliveryRadiusKm) setRadiusKm(settings.deliveryRadiusKm);
  }, [settings]);

  // --------------------------------------------------------------------------
  // DELIVERY BOYS STATE
  // --------------------------------------------------------------------------
  const [deliveryBoys, setDeliveryBoys] = useState<
    (DeliveryBoy & {
      totalDeliveredOrders: number;
      totalDeliveryDistanceKm: number;
      currentOrders: number;
      cancelledOrders: number;
      todayOrders: number;
    })[]
  >([]);
  const [loadingBoys, setLoadingBoys] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBoyHistory, setSelectedBoyHistory] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add / Edit Delivery Boy Form State
  const [editingBoy, setEditingBoy] = useState<DeliveryBoy | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset password modal
  const [resetModalBoy, setResetModalBoy] = useState<DeliveryBoy | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Delete delivery boy confirmation
  const [deleteBoyConfirm, setDeleteBoyConfirm] = useState<DeliveryBoy | null>(null);
  const [isDeletingBoy, setIsDeletingBoy] = useState(false);
  const [deleteBoyError, setDeleteBoyError] = useState<string | null>(null);

  const handleConfirmDeleteBoy = async () => {
    if (!deleteBoyConfirm) return;
    setIsDeletingBoy(true);
    setDeleteBoyError(null);
    try {
      const res = await fetch(`/api/admin/delivery/boys/${deleteBoyConfirm.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        setDeleteBoyConfirm(null);
        await fetchDeliveryBoys();
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteBoyError(data.error || 'Failed to delete delivery partner');
      }
    } catch (err: any) {
      setDeleteBoyError(err.message || 'Error occurred while deleting delivery partner');
    } finally {
      setIsDeletingBoy(false);
    }
  };

  // Order Dispatch quick assign state
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'unassigned' | 'assigned' | 'delivered'>('all');

  // Fetch Delivery Boys list from backend
  const fetchDeliveryBoys = useCallback(async () => {
    try {
      setLoadingBoys(true);
      const res = await fetch('/api/admin/delivery/boys', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveryBoys(data);
      }
    } catch (err) {
      console.error('Failed to fetch delivery boys:', err);
    } finally {
      setLoadingBoys(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchDeliveryBoys();
  }, [fetchDeliveryBoys]);

  // Handle GPS detection for restaurant
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationSuccess('Geolocation is not supported by your browser');
      return;
    }
    setDetectingGps(true);
    setLocationSuccess('Requesting live GPS coordinates...');

    const onPosSuccess = async (pos: GeolocationPosition) => {
      const detectedLat = parseFloat(pos.coords.latitude.toFixed(6));
      const detectedLng = parseFloat(pos.coords.longitude.toFixed(6));
      setLat(detectedLat);
      setLng(detectedLng);
      setDetectingGps(false);
      setLocationSuccess(`GPS detected: ${detectedLat}, ${detectedLng}. Resolving address...`);

      try {
        const res = await fetch(`/api/geocode/reverse?lat=${detectedLat}&lng=${detectedLng}`);
        if (res.ok) {
          const data = await res.json();
          if (data.formattedAddress) setAddress(data.formattedAddress);
          if (data.city) setCity(data.city);
          if (data.pincode) setPincode(data.pincode);
          setLocationSuccess(`Restaurant GPS and address updated: ${data.city || 'Detected Location'} (${detectedLat}, ${detectedLng})`);
        }
      } catch {
        setLocationSuccess(`GPS locked at ${detectedLat}, ${detectedLng}`);
      }
    };

    const onPosError = (err: GeolocationPositionError) => {
      // Retry with standard accuracy if high accuracy timed out
      if (err.code === 3 || err.code === 2) {
        navigator.geolocation.getCurrentPosition(
          onPosSuccess,
          (err2) => {
            setDetectingGps(false);
            setLocationSuccess(`GPS signal unavailable: ${err2.message}. You can enter coordinates manually.`);
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      } else {
        setDetectingGps(false);
        setLocationSuccess(`Location permission notice: ${err.message}. You can enter address and coordinates manually.`);
      }
    };

    navigator.geolocation.getCurrentPosition(onPosSuccess, onPosError, {
      enableHighAccuracy: true,
      timeout: 6000,
    });
  };

  // Save Restaurant Location & Delivery Radius
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLocation(true);
    setLocationSuccess(null);

    const effectiveRadius = customRadius ? parseFloat(customRadius) : radiusKm;

    try {
      const res = await fetch('/api/admin/delivery/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          location: {
            latitude: Number(lat),
            longitude: Number(lng),
            address: address.trim(),
            city: city.trim(),
            pincode: pincode.trim(),
          },
          deliveryRadiusKm: Number(effectiveRadius),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        onSettingsUpdated({
          ...settings,
          location: updated.location,
          deliveryRadiusKm: updated.deliveryRadiusKm,
        });
        setLocationSuccess(`Restaurant location and ${updated.deliveryRadiusKm} KM delivery radius updated successfully!`);
        setTimeout(() => setLocationSuccess(null), 5000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update location');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setSavingLocation(false);
    }
  };

  // Open Create/Edit modal
  const handleOpenAddModal = (boy?: DeliveryBoy) => {
    setFormError(null);
    if (boy) {
      setEditingBoy(boy);
      setFormName(boy.name);
      setFormPhone(boy.phone);
      setFormUsername(boy.username);
      setFormPassword('');
      setFormStatus(boy.status);
    } else {
      setEditingBoy(null);
      setFormName('');
      setFormPhone('');
      const nextNum = deliveryBoys.length + 1;
      setFormUsername(`Deliveryboy${nextNum}`);
      setFormPassword(`Diliveryboy@${nextNum}#`);
      setFormStatus('active');
    }
    setShowAddModal(true);
  };

  // Submit Add / Edit Delivery Boy
  const handleSubmitBoyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formPhone.trim() || !formUsername.trim()) {
      setFormError('Please fill in all required fields');
      return;
    }

    setFormSubmitting(true);
    try {
      const url = editingBoy
        ? `/api/admin/delivery/boys/${editingBoy.id}`
        : '/api/admin/delivery/boys';
      const method = editingBoy ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          username: formUsername.trim(),
          password: formPassword.trim() || undefined,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save delivery boy');
        setFormSubmitting(false);
        return;
      }

      setShowAddModal(false);
      fetchDeliveryBoys();
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Delivery Boy Active / Inactive
  const handleToggleBoyStatus = async (boyId: string) => {
    try {
      const res = await fetch(`/api/admin/delivery/boys/${boyId}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        fetchDeliveryBoys();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Reset Delivery Boy Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalBoy || !newPassword.trim()) return;

    setResetSubmitting(true);
    try {
      const res = await fetch(`/api/admin/delivery/boys/${resetModalBoy.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      if (res.ok) {
        setResetSuccess('Password reset successfully!');
        setTimeout(() => {
          setResetSuccess(null);
          setResetModalBoy(null);
          setNewPassword('');
        }, 1800);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reset password');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setResetSubmitting(false);
    }
  };

  // View Delivery Boy History Modal
  const handleViewBoyHistory = async (boyId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/delivery/boys/${boyId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedBoyHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Quick Assign Order to Delivery Boy
  const handleAssignOrder = async (orderId: string, boyId: string) => {
    if (!boyId) return;
    const selectedBoy = deliveryBoys.find((b) => b.id === boyId);
    setAssigningOrderId(orderId);

    try {
      const res = await fetch('/api/admin/delivery/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          orderId,
          deliveryBoyId: boyId,
          deliveryBoyName: selectedBoy?.name,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        if (onOrderUpdated) onOrderUpdated(updated);
        fetchDeliveryBoys();
      }
    } catch (err) {
      console.error('Failed to assign delivery:', err);
    } finally {
      setAssigningOrderId(null);
    }
  };

  // Filter delivery orders
  const deliveryOrders = orders.filter((o) => o.orderType === 'Delivery');
  const filteredOrders = deliveryOrders.filter((o) => {
    // Status filter
    if (orderStatusFilter === 'unassigned' && (o.assignedDeliveryBoyId || o.deliveryStatus === 'Delivered')) {
      return false;
    }
    if (orderStatusFilter === 'assigned' && (!o.assignedDeliveryBoyId || o.deliveryStatus === 'Delivered')) {
      return false;
    }
    if (orderStatusFilter === 'delivered' && o.deliveryStatus !== 'Delivered') {
      return false;
    }

    // Search filter
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchCust = (o.customerName || o.customer?.fullName || '').toLowerCase().includes(q);
      const matchBoy = (o.assignedDeliveryBoyName || '').toLowerCase().includes(q);
      const matchAddr = (o.customerDeliveryAddress || '').toLowerCase().includes(q);
      return matchId || matchCust || matchBoy || matchAddr;
    }

    return true;
  });

  // Totals calculations
  const totalCompletedDeliveries = deliveryBoys.reduce((sum, b) => sum + b.totalDeliveredOrders, 0);
  const totalCompletedDistanceKm = Math.round(
    deliveryBoys.reduce((sum, b) => sum + b.totalDeliveryDistanceKm, 0) * 10
  ) / 10;
  const activeBoysCount = deliveryBoys.filter((b) => b.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
            <span>Delivery Management, Radius &amp; Tracking</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure restaurant center point, set delivery boundary radius, and manage delivery boys.
          </p>
        </div>

        <button
          onClick={fetchDeliveryBoys}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-2 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingBoys ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Delivery Fleet</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{deliveryBoys.length}</div>
          <p className="text-[11px] text-emerald-400 mt-0.5">{activeBoysCount} Active Partners</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Max Delivery Radius</span>
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1.5">{radiusKm} KM</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Strict boundary gating</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Completed Deliveries</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1.5">{totalCompletedDeliveries}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">All time delivered</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Total Delivered Distance</span>
            <MapPin className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1.5">{totalCompletedDistanceKm} KM</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Delivered orders only</p>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 1: RESTAURANT LOCATION & DELIVERY RADIUS SETTINGS */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>1. Restaurant Location &amp; Delivery Radius</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Saved coordinates act as the center point for all distance and radius calculations.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detectingGps}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition self-start sm:self-auto"
          >
            <Compass className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
            <span>{detectingGps ? 'Detecting GPS...' : 'Auto-Detect Restaurant GPS'}</span>
          </button>
        </div>

        {locationSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{locationSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSaveLocation} className="space-y-5">
          {/* Coordinates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Restaurant Latitude * <span className="text-slate-500 font-normal">(Center point)</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                placeholder="e.g. 19.0760"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Restaurant Longitude * <span className="text-slate-500 font-normal">(Center point)</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                placeholder="e.g. 72.8777"
              />
            </div>
          </div>

          {/* Address and City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Restaurant Address / Landmark
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                placeholder="Shop address for dispatch pickup"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">City &amp; Pincode</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-1/2 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  placeholder="City"
                />
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-1/2 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  placeholder="Pincode"
                />
              </div>
            </div>
          </div>

          {/* Delivery Radius Setting */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              Maximum Delivery Radius Setting <span className="text-amber-400 font-semibold">({radiusKm} KM)</span>
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {[2, 5, 10, 15].map((km) => (
                <button
                  type="button"
                  key={km}
                  onClick={() => {
                    setRadiusKm(km);
                    setCustomRadius('');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${
                    radiusKm === km && !customRadius
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {km} KM
                </button>
              ))}

              {/* Custom KM Input */}
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-500">or Custom:</span>
                <div className="relative w-28">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    placeholder="e.g. 7.5"
                    value={customRadius}
                    onChange={(e) => {
                      setCustomRadius(e.target.value);
                      if (e.target.value) setRadiusKm(parseFloat(e.target.value));
                    }}
                    className={`w-full px-3 py-1.5 bg-slate-950 border rounded-xl text-xs font-bold text-white focus:outline-none ${
                      customRadius ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-slate-800'
                    }`}
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] font-bold text-slate-500">KM</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Accurate Radius Rule:</strong> Any customer beyond <strong>{radiusKm} KM</strong> from the saved coordinates will be prevented from placing delivery orders. For historical orders, previously calculated distance is safely preserved.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingLocation}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center space-x-2"
            >
              {savingLocation ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Location &amp; Delivery Radius</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 2: DELIVERY BOYS MANAGEMENT (CRUD) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>2. Delivery Boy Management &amp; Tracking</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage accounts, assign sequential partner numbers, and monitor individual delivery distance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center space-x-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Delivery Boy</span>
          </button>
        </div>

        {/* Delivery Boys List */}
        {loadingBoys ? (
          <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Loading delivery fleet...</span>
          </div>
        ) : deliveryBoys.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            No delivery boys registered yet. Click &quot;Add Delivery Boy&quot; above to create partner #1.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {deliveryBoys.map((boy) => (
              <div
                key={boy.id}
                className="bg-slate-950/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 space-y-3.5 transition"
              >
                {/* Header: Number, Name, Status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-sm">
                      #{boy.deliveryBoyNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{boy.name}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Smartphone className="w-3 h-3 text-slate-500" />
                        <span>{boy.phone}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status toggle pill */}
                  <button
                    onClick={() => handleToggleBoyStatus(boy.id)}
                    title={`Click to ${boy.status === 'active' ? 'Deactivate' : 'Activate'}`}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1 transition ${
                      boy.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{boy.status === 'active' ? 'Active' : 'Inactive'}</span>
                  </button>
                </div>

                {/* Login username indicator */}
                <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <span className="text-slate-500">Portal Login:</span>
                  <span className="font-mono text-amber-400 font-semibold">{boy.username}</span>
                </div>

                {/* Delivery Stats Grid */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900 text-center">
                  <div className="bg-slate-900/50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Delivered</span>
                    <span className="text-sm font-black text-emerald-400">{boy.totalDeliveredOrders}</span>
                  </div>

                  <div className="bg-slate-900/50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Dist.</span>
                    <span className="text-sm font-black text-purple-400">{boy.totalDeliveryDistanceKm} KM</span>
                  </div>

                  <div className="bg-slate-900/50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">In-Progress</span>
                    <span className="text-sm font-black text-amber-400">{boy.currentOrders}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => handleViewBoyHistory(boy.id)}
                    className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition"
                  >
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>History</span>
                  </button>

                  <button
                    onClick={() => {
                      setResetModalBoy(boy);
                      setNewPassword('');
                      setResetSuccess(null);
                    }}
                    className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-bold flex items-center space-x-1 transition"
                    title="Reset Login Password"
                  >
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>Password</span>
                  </button>

                  <button
                    onClick={() => handleOpenAddModal(boy)}
                    className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-bold flex items-center space-x-1 transition"
                    title="Edit Partner Profile"
                  >
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      setDeleteBoyError(null);
                      setDeleteBoyConfirm(boy);
                    }}
                    className="py-1.5 px-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl text-[11px] font-bold flex items-center space-x-1 border border-rose-800/40 hover:border-rose-600 transition"
                    title="Delete Delivery Partner"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 3: ORDER DISPATCH & DISTANCE MONITOR */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center space-x-2">
              <Compass className="w-4 h-4 text-amber-500" />
              <span>3. Order Dispatch &amp; Calculated Distance Monitor</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect Haversine distance from restaurant and assign orders to delivery partners.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search orders, boy, addr..."
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 w-44 sm:w-56"
              />
            </div>

            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none font-semibold"
            >
              <option value="all">All Deliveries ({deliveryOrders.length})</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            No delivery orders found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Order ID</th>
                  <th className="py-3 px-3">Customer &amp; Address</th>
                  <th className="py-3 px-3">Calculated Distance</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Assigned Partner</th>
                  <th className="py-3 px-3 text-right">Quick Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((order) => {
                  const distDisplay = order.deliveryDistanceDisplay || (order.deliveryDistanceKm ? `${order.deliveryDistanceKm} KM` : '2.0 KM');
                  const isDelivered = order.status === 'Delivered' || order.deliveryStatus === 'Delivered';

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3">
                        <span className="font-bold text-white block">{order.id}</span>
                        <span className="text-[10px] text-amber-400 font-semibold">₹{order.grandTotal}</span>
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <span className="font-bold text-white block truncate">
                          {order.customerName || order.customer?.fullName}
                        </span>
                        <p className="text-[11px] text-slate-400 truncate">
                          {order.customerDeliveryAddress || order.deliveryAddress?.house || 'Delivery Address'}
                        </p>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px]">
                            {distDisplay}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Radius at order: {order.deliveryRadiusAtOrder || radiusKm} KM
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelivered
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : order.status === 'Cancelled'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {order.deliveryStatus || order.status}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {order.assignedDeliveryBoyName ? (
                          <div className="flex items-center space-x-1.5 text-white">
                            <Bike className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-bold">
                              #{order.assignedDeliveryBoyNumber || 1} {order.assignedDeliveryBoyName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <select
                          disabled={isDelivered || assigningOrderId === order.id}
                          value={order.assignedDeliveryBoyId || ''}
                          onChange={(e) => handleAssignOrder(order.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                        >
                          <option value="">Select Partner</option>
                          {deliveryBoys
                            .filter((b) => b.status === 'active')
                            .map((boy) => (
                              <option key={boy.id} value={boy.id}>
                                #{boy.deliveryBoyNumber} {boy.name}
                              </option>
                            ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT DELIVERY BOY */}
      {/* ---------------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base flex items-center space-x-2">
                <Bike className="w-4 h-4 text-amber-500" />
                <span>{editingBoy ? `Edit Partner #${editingBoy.deliveryBoyNumber}` : 'Add New Delivery Boy'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBoyForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Phone Number *</label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Login Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deliveryboy2"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {editingBoy ? 'New Password (leave blank to keep current)' : 'Login Password *'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    required={!editingBoy}
                    placeholder="Set partner password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  {formSubmitting ? 'Saving...' : editingBoy ? 'Update Partner' : 'Create Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: RESET PASSWORD */}
      {/* ---------------------------------------------------------------------- */}
      {resetModalBoy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-sm flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Reset Password: #{resetModalBoy.deliveryBoyNumber}</span>
              </h3>
              <button
                onClick={() => setResetModalBoy(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  New Password for {resetModalBoy.name}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetModalBoy(null)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold"
                >
                  {resetSubmitting ? 'Resetting...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: DELIVERY BOY HISTORY */}
      {/* ---------------------------------------------------------------------- */}
      {selectedBoyHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center space-x-2">
                  <span className="text-amber-400">#{selectedBoyHistory.deliveryBoyNumber}</span>
                  <span>{selectedBoyHistory.name} - Delivery History</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Completed: {selectedBoyHistory.totalDeliveredOrders} orders | Total Delivered Distance:{' '}
                  <span className="text-purple-400 font-bold">{selectedBoyHistory.totalDeliveryDistanceKm} KM</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedBoyHistory(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 pr-1">
              {!selectedBoyHistory.orderHistory || selectedBoyHistory.orderHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No orders have been assigned to this delivery partner yet.
                </div>
              ) : (
                selectedBoyHistory.orderHistory.map((order: Order) => (
                  <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{order.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'Delivered'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-0.5 truncate max-w-sm">
                        {order.customerDeliveryAddress || 'Customer Address'}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()} at{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-white block">₹{order.grandTotal}</span>
                      <span className="text-[11px] font-extrabold text-purple-400">
                        {order.deliveryDistanceDisplay || (order.deliveryDistanceKm ? `${order.deliveryDistanceKm} KM` : 'N/A')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBoyHistory(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Delivery Partner Confirmation Modal (Iframe-Safe) */}
      {deleteBoyConfirm && (
        <div
          id="admin-delete-boy-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            id="admin-delete-boy-modal"
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">
                Delete Delivery Partner?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <span className="text-white font-bold">&ldquo;#{deleteBoyConfirm.deliveryBoyNumber} {deleteBoyConfirm.name}&rdquo;</span>?
                Their login access will be revoked and they will be unassigned from any active orders.
              </p>
            </div>

            {deleteBoyError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center justify-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteBoyError}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                id="admin-delete-boy-cancel-btn"
                disabled={isDeletingBoy}
                onClick={() => {
                  setDeleteBoyConfirm(null);
                  setDeleteBoyError(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="admin-delete-boy-confirm-btn"
                disabled={isDeletingBoy}
                onClick={handleConfirmDeleteBoy}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
              >
                {isDeletingBoy ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
