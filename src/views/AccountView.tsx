import React, { useState, useRef } from 'react';
import {
  Clock,
  LogOut,
  Save,
  CheckCircle2,
  Heart,
  Bell,
  Trash2,
  Headphones,
  ArrowRight,
  MessageCircle,
  Camera,
  Upload,
  User,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Wallet,
  Coins,
  Gift,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useOrderNotification } from '../context/OrderNotificationContext';
import { useWallet } from '../context/WalletContext';
import { formatCoins, coinsToRupees } from '../utils/loyalty';

interface AccountViewProps {
  onNavigate: (path: string) => void;
}

const PRESET_AVATARS = [
  { id: 'av-1', label: 'Biryani Chef', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
  { id: 'av-2', label: 'Foodie', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
  { id: 'av-3', label: 'Gourmet', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
  { id: 'av-4', label: 'Culinary Fan', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  { id: 'av-5', label: 'Spice Lover', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' },
  { id: 'av-6', label: 'Cruze Diner', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80' },
];

export const AccountView: React.FC<AccountViewProps> = ({ onNavigate }) => {
  const { customer, logoutCustomer, updateProfile } = useAuth();
  const { wallet, rules } = useWallet();
  const { settings } = useSettings();
  const {
    notifications,
    deleteNotification,
    clearAllNotifications,
    markAsRead,
  } = useOrderNotification();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(customer?.fullName || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [avatar, setAvatar] = useState(customer?.avatar || customer?.profilePic || '');
  const [deliveryAddress, setDeliveryAddress] = useState(customer?.deliveryAddress || '');
  const [landmark, setLandmark] = useState(customer?.landmark || '');
  const [pincode, setPincode] = useState(customer?.pincode || '');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Handle local photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size should be less than 5MB');
      return;
    }

    setAvatarError(null);
    setUploadingAvatar(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl,
              filename: `profile_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
            }),
          });
          let finalUrl = dataUrl;
          if (res.ok) {
            const data = await res.json();
            if (data.url) finalUrl = data.url;
          }
          setAvatar(finalUrl);
          await updateProfile({ avatar: finalUrl, profilePic: finalUrl });
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2500);
        } catch {
          setAvatar(dataUrl);
          await updateProfile({ avatar: dataUrl, profilePic: dataUrl });
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2500);
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to read image');
      setUploadingAvatar(false);
    }
  };

  const handleSelectPresetAvatar = async (url: string) => {
    setAvatar(url);
    await updateProfile({ avatar: url, profilePic: url });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleRemoveAvatar = async () => {
    setAvatar('');
    await updateProfile({ avatar: '', profilePic: '' });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleApplyCustomUrl = async () => {
    if (!customAvatarUrl.trim()) return;
    const url = customAvatarUrl.trim();
    setAvatar(url);
    await updateProfile({ avatar: url, profilePic: url });
    setShowUrlInput(false);
    setCustomAvatarUrl('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const success = await updateProfile({
      fullName,
      phone,
      avatar,
      profilePic: avatar,
      deliveryAddress,
      landmark,
      pincode,
    });
    setSaving(false);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleLogout = () => {
    logoutCustomer();
    onNavigate('/login');
  };

  return (
    <div id="customer-account-view" className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Hidden file input for profile picture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Header Profile Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* Avatar with click-to-change overlay */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer shrink-0"
            title="Click to change profile picture"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={customer?.fullName || 'Profile'}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-500/50 shadow-md shadow-amber-500/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-amber-500/20">
                {customer?.fullName?.charAt(0).toUpperCase() || 'C'}
              </div>
            )}
            <div className="absolute inset-0 bg-slate-950/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
              {uploadingAvatar ? (
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              ) : (
                <>
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Change</span>
                </>
              )}
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center shadow-sm border-2 border-white transition"
              title="Upload Photo"
              aria-label="Upload Photo"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-900">{customer?.fullName}</h1>
            <p className="text-xs text-slate-500">{customer?.phone}</p>
            <p className="text-xs text-slate-400">{customer?.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition flex items-center space-x-1.5 border border-amber-200"
          >
            <Camera className="w-3.5 h-3.5 text-amber-600" />
            <span>Change Photo</span>
          </button>

          <button
            id="account-logout-btn"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs transition flex items-center space-x-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Customer Wallet & Rewards Overview Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                Cruze Wallet &amp; Loyalty
              </span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  ₹{(wallet?.balance ?? 0).toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 font-medium">available cash</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onNavigate('/wallet')}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-md shadow-amber-500/20 flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Money</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/wallet')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>View Wallet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-2.5 pt-4 text-left relative z-10">
          <div className="bg-slate-800/60 p-2.5 sm:p-3 rounded-2xl border border-slate-700/50">
            <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-medium">
              <Coins className="w-3 h-3 text-amber-400" />
              <span>Reward Coins</span>
            </div>
            <span className="text-sm sm:text-base font-extrabold text-amber-300 block mt-0.5">
              {formatCoins(wallet?.coins ?? 0)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              (= ₹{coinsToRupees(wallet?.coins ?? 0, rules.conversionRate || 10).toFixed(2)})
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 sm:p-3 rounded-2xl border border-slate-700/50">
            <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-medium">
              <Gift className="w-3 h-3 text-emerald-400" />
              <span>Cashback</span>
            </div>
            <span className="text-sm sm:text-base font-extrabold text-emerald-400 block mt-0.5">
              ₹{(wallet?.cashbackBalance ?? 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block">earned on orders</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 sm:p-3 rounded-2xl border border-slate-700/50">
            <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-medium">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Reward Rate</span>
            </div>
            <span className="text-sm sm:text-base font-extrabold text-purple-300 block mt-0.5">
              0.5 coin/₹1
            </span>
            <span className="text-[10px] text-slate-400 block">orders ≥ ₹100</span>
          </div>
        </div>
      </div>

      {/* Profile Photo Management Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Profile Picture
              </h2>
              <p className="text-[11px] text-slate-500">
                Personalize your customer profile with a custom photo or avatar
              </p>
            </div>
          </div>

          {avatar && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Photo</span>
            </button>
          )}
        </div>

        {avatarError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
            {avatarError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt="Selected avatar"
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-amber-500/40 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-100 text-slate-400 flex flex-col items-center justify-center text-xs font-bold border-2 border-dashed border-slate-300">
                <User className="w-7 h-7 text-slate-400 mb-1" />
                <span>No Photo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <p className="text-xs text-slate-700 font-semibold">
              Upload your own picture from device or pick from fun foodie avatars:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-upload-profile-pic"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                {uploadingAvatar ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{uploadingAvatar ? 'Uploading...' : 'Upload from Device'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Paste Photo URL</span>
              </button>
            </div>

            {showUrlInput && (
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="url"
                  placeholder="https://example.com/your-photo.jpg"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preset Avatar Selection Gallery */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Or choose a Kitchen Cruze profile avatar:</span>
          </label>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_AVATARS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPresetAvatar(preset.url)}
                className={`group relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                  avatar === preset.url
                    ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105'
                    : 'border-slate-200 hover:border-amber-400'
                }`}
                title={preset.label}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                {avatar === preset.url && (
                  <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 drop-shadow-sm" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Saved Profile &amp; Delivery Address
          </h2>
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1 animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved Successfully!</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Primary Delivery Address
            </label>
            <textarea
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Flat No, Building, Street, Area"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Landmark</label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Nearby park / hospital / shop"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="e.g. 110001"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
        </button>
      </form>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('/orders')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 text-left transition"
        >
          <Clock className="w-5 h-5 text-amber-500 mb-2" />
          <h3 className="font-bold text-xs text-slate-900">Your Orders</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Track live deliveries</p>
        </button>

        <button
          onClick={() => onNavigate('/menu')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 text-left transition"
        >
          <Heart className="w-5 h-5 text-rose-500 mb-2" />
          <h3 className="font-bold text-xs text-slate-900">Order Again</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Explore popular dishes</p>
        </button>
      </div>

      {/* Customer Support & Help Desk Action Card */}
      <button
        type="button"
        id="account-customer-support-card"
        onClick={() => onNavigate('/support')}
        className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 border border-amber-500/30 hover:border-amber-500/60 shadow-2xs hover:bg-amber-50/70 text-left transition flex items-center justify-between group cursor-pointer"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-105 transition">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-xs sm:text-sm text-slate-900">Customer Support &amp; Help Desk</h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Live Support
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Need assistance with an active order, payment, or menu inquiry? Contact our support team or submit a ticket.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-amber-600 font-bold text-xs shrink-0 pl-2">
          <span className="hidden sm:inline">Get Help</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
        </div>
      </button>

      {/* Customer Order Notifications Management Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Order Notifications
            </h2>
            {notifications.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>

          {notifications.length > 0 && (
            <button
              type="button"
              id="account-delete-all-notifs-btn"
              onClick={clearAllNotifications}
              className="text-slate-400 hover:text-rose-600 text-xs font-bold flex items-center space-x-1 transition px-2 py-1 rounded-lg hover:bg-rose-50"
              title="Delete all customer notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All</span>
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-6 text-center text-slate-400 space-y-1">
            <Bell className="w-6 h-6 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No active notifications</p>
            <p className="text-[11px] text-slate-400">
              Live updates for your kitchen orders will appear here and in the top alert bell.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-slate-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 group"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    markAsRead(notif.id);
                    onNavigate(`/orders/${notif.orderId}`);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{notif.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">#{notif.orderNumber}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{notif.message}</p>
                </div>

                <button
                  type="button"
                  id={`account-delete-notif-${notif.id}`}
                  onClick={() => deleteNotification(notif.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete notification"
                  aria-label="Delete notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
