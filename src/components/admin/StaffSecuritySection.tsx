import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  ChefHat,
  Bike,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  KeyRound,
} from 'lucide-react';
import { apiFetch, safeJson } from '../../utils/api';

interface StaffAccount {
  id: string;
  username: string;
  role: 'admin' | 'chef' | 'delivery';
  name: string;
  email: string;
  status: string;
}

interface StaffSecuritySectionProps {
  adminToken: string | null;
  onNavigate: (path: string) => void;
}

export const StaffSecuritySection: React.FC<StaffSecuritySectionProps> = ({ adminToken, onNavigate }) => {
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Chef edit state
  const [chefUsername, setChefUsername] = useState('Cafekitchencruze12');
  const [chefPassword, setChefPassword] = useState('');
  const [showChefPassword, setShowChefPassword] = useState(false);
  const [chefSaving, setChefSaving] = useState(false);
  const [chefSuccess, setChefSuccess] = useState<string | null>(null);
  const [chefError, setChefError] = useState<string | null>(null);

  // Delivery edit state
  const [deliveryUsername, setDeliveryUsername] = useState('Diliveryboy112');
  const [deliveryPassword, setDeliveryPassword] = useState('');
  const [showDeliveryPassword, setShowDeliveryPassword] = useState(false);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      const res = await apiFetch('/api/admin/staff', {
        headers: { ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) },
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) {
          setStaffList(data);
          const chef = data.find((s) => s.role === 'chef');
          if (chef) setChefUsername(chef.username);
          const del = data.find((s) => s.role === 'delivery');
          if (del) setDeliveryUsername(del.username);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch staff accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [adminToken]);

  const handleUpdateChef = async (e: React.FormEvent) => {
    e.preventDefault();
    setChefError(null);
    setChefSuccess(null);

    if (!chefUsername.trim()) {
      setChefError('Chef username cannot be empty');
      return;
    }
    if (chefPassword && chefPassword.trim().length < 6) {
      setChefError('New password must be at least 6 characters long');
      return;
    }

    setChefSaving(true);
    try {
      const res = await apiFetch('/api/admin/staff/chef', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          username: chefUsername.trim(),
          password: chefPassword.trim() || undefined,
        }),
      });
      const data = await safeJson(res, 'Failed to update chef credentials');
      setChefSuccess(data.message || 'Chef credentials successfully updated by Admin!');
      setChefPassword('');
      fetchStaff();
      setTimeout(() => setChefSuccess(null), 4000);
    } catch (err: any) {
      setChefError(err.message || 'Update failed');
    } finally {
      setChefSaving(false);
    }
  };

  const handleUpdateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeliveryError(null);
    setDeliverySuccess(null);

    if (!deliveryUsername.trim()) {
      setDeliveryError('Delivery partner username cannot be empty');
      return;
    }
    if (deliveryPassword && deliveryPassword.trim().length < 6) {
      setDeliveryError('New password must be at least 6 characters long');
      return;
    }

    setDeliverySaving(true);
    try {
      const res = await apiFetch('/api/admin/staff/delivery', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          username: deliveryUsername.trim(),
          password: deliveryPassword.trim() || undefined,
        }),
      });
      const data = await safeJson(res, 'Failed to update delivery partner credentials');
      setDeliverySuccess(data.message || 'Delivery partner credentials successfully updated by Admin!');
      setDeliveryPassword('');
      fetchStaff();
      setTimeout(() => setDeliverySuccess(null), 4000);
    } catch (err: any) {
      setDeliveryError(err.message || 'Update failed');
    } finally {
      setDeliverySaving(false);
    }
  };

  return (
    <div id="admin-staff-security-section" className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-black text-white">Staff Roles &amp; Security Credentials</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Centrally control credentials and security policies across Admin, Kitchen/Chef, and Delivery portals.
          </p>
        </div>
      </div>

      {/* Grid of 3 Portals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. ADMIN CARD (PERMANENT & LOCKED) */}
        <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <Lock className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>PERMANENT LOCKED</span>
              </span>
            </div>
            <h3 className="text-sm font-black text-white">1. Admin Dashboard</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Access: Restaurant settings, menu management, order dispatch, categories, and customer records.
            </p>

            <div className="mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Username</span>
                <span className="font-mono font-bold text-amber-400">Kitchencruze12</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Password</span>
                <span className="font-mono font-bold text-slate-300">amdin@12#21</span>
              </div>
            </div>

            <p className="text-[10px] text-amber-300/80 mt-3 flex items-start space-x-1.5 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>Admin credentials are permanently locked and cannot be altered by anyone for maximum security.</span>
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Route: /admin</span>
            <span className="text-emerald-400 font-bold flex items-center space-x-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active</span>
            </span>
          </div>
        </div>

        {/* 2. CHEF / KITCHEN CARD (ADMIN-EDITABLE) */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <ChefHat className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full">
                Admin Managed
              </span>
            </div>
            <h3 className="text-sm font-black text-white">2. Kitchen / Chef Portal</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Access: Live Kitchen Display System (KDS), cooking queue, timers, ready-for-dispatch.
            </p>

            <form onSubmit={handleUpdateChef} className="mt-4 space-y-3">
              {chefSuccess && (
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] rounded-lg flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{chefSuccess}</span>
                </div>
              )}
              {chefError && (
                <div className="p-2 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] rounded-lg flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{chefError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Chef Username
                </label>
                <input
                  type="text"
                  required
                  value={chefUsername}
                  onChange={(e) => setChefUsername(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  New Password <span className="text-slate-500 font-normal">(Leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <input
                    type={showChefPassword ? 'text' : 'password'}
                    placeholder="Cafe@12#113"
                    value={chefPassword}
                    onChange={(e) => setChefPassword(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChefPassword(!showChefPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showChefPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={chefSaving}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
              >
                {chefSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Update Chef Credentials</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigate('/chef/login')}
              className="text-emerald-400 hover:underline flex items-center space-x-1 text-[11px]"
            >
              <span>Test /chef/login</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <span className="text-slate-500 text-[10px]">Chef cannot self-change</span>
          </div>
        </div>

        {/* 3. DELIVERY PARTNER CARD (ADMIN-EDITABLE) */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                <Bike className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-full">
                Admin Managed
              </span>
            </div>
            <h3 className="text-sm font-black text-white">3. Delivery Fleet Partner</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Access: Dispatched orders, pickup verification, GPS routing, delivery completion, COD tracking.
            </p>

            <form onSubmit={handleUpdateDelivery} className="mt-4 space-y-3">
              {deliverySuccess && (
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] rounded-lg flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{deliverySuccess}</span>
                </div>
              )}
              {deliveryError && (
                <div className="p-2 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] rounded-lg flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{deliveryError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Delivery Username
                </label>
                <input
                  type="text"
                  required
                  value={deliveryUsername}
                  onChange={(e) => setDeliveryUsername(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  New Password <span className="text-slate-500 font-normal">(Leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <input
                    type={showDeliveryPassword ? 'text' : 'password'}
                    placeholder="Diliveryboy@12#1"
                    value={deliveryPassword}
                    onChange={(e) => setDeliveryPassword(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeliveryPassword(!showDeliveryPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showDeliveryPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={deliverySaving}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
              >
                {deliverySaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Update Delivery Credentials</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigate('/delivery/login')}
              className="text-cyan-400 hover:underline flex items-center space-x-1 text-[11px]"
            >
              <span>Test /delivery/login</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <span className="text-slate-500 text-[10px]">Delivery cannot self-change</span>
          </div>
        </div>
      </div>
    </div>
  );
};
