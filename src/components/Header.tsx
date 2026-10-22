import React from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  Tag,
  Clock,
  MapPin,
  Globe,
  Utensils,
  Bike,
  ShieldCheck,
  Headphones,
  Wallet,
} from 'lucide-react';
import { KitchenCruzeLogo } from './KitchenCruzeLogo';
import { NotificationBell } from './notifications/NotificationBell';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useSettings } from '../context/SettingsContext';
import { formatCoins } from '../utils/loyalty';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../utils/i18n';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenSupport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  searchQuery = '',
  onSearchChange,
  onOpenSupport,
}) => {
  const { totalItemsCount, grandTotal } = useCart();
  const { customer, isCustomerAuthenticated, isAdminAuthenticated, isChefAuthenticated, isDeliveryAuthenticated } = useAuth();
  const { wallet } = useWallet();
  const { settings, language, setLanguage, t } = useSettings();

  const isStoreOpen = settings.isOpen !== false;

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all w-full overflow-hidden sm:overflow-visible"
    >
      {/* Top micro-bar: Restaurant status & timing & language */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 hidden md:flex items-center justify-between border-b border-slate-800 overflow-hidden">
        <div className="flex items-center space-x-4 max-w-7xl mx-auto w-full min-w-0">
          <div className="flex items-center space-x-1.5 font-medium shrink-0">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStoreOpen ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isStoreOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className={isStoreOpen ? 'text-emerald-400' : 'text-red-400'}>
              {isStoreOpen ? 'Kitchen Open & Cooking' : 'Kitchen Currently Closed'}
            </span>
          </div>

          {settings.openingTime && settings.closingTime && (
            <div className="hidden lg:flex items-center space-x-2 shrink-0">
              <div className="text-slate-600">|</div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{settings.openingTime} - {settings.closingTime}</span>
              </div>
            </div>
          )}

          {settings.address && (
            <div className="hidden xl:flex items-center space-x-2 shrink-0 max-w-xs">
              <div className="text-slate-600">|</div>
              <div className="flex items-center space-x-1 truncate text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{settings.address}</span>
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center space-x-4 text-xs shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <select
                id="header-language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-slate-800 text-slate-200 text-xs px-2 py-0.5 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-700">|</div>

            {/* Portal links */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                id="header-chef-portal-link"
                onClick={() => onNavigate(isChefAuthenticated ? '/chef' : '/chef-login')}
                className="flex items-center space-x-1 text-slate-300 hover:text-amber-400 transition text-xs"
                title="Chef Kitchen Portal"
              >
                <Utensils className="w-3.5 h-3.5 text-amber-400" />
                <span>Chef</span>
              </button>

              <button
                id="header-delivery-portal-link"
                onClick={() => onNavigate(isDeliveryAuthenticated ? '/delivery' : '/delivery-login')}
                className="flex items-center space-x-1 text-slate-300 hover:text-amber-400 transition text-xs"
                title="Delivery Partner Portal"
              >
                <Bike className="w-3.5 h-3.5 text-amber-400" />
                <span>Delivery</span>
              </button>

              <button
                id="header-admin-quick-link"
                onClick={() => onNavigate(isAdminAuthenticated ? '/admin' : '/admin-login')}
                className="flex items-center space-x-1 text-slate-300 hover:text-amber-400 transition text-xs"
                title="Administrator Management"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Admin</span>
              </button>

              <div className="text-slate-700">|</div>

              <button
                id="header-support-quick-link"
                onClick={() => (onOpenSupport ? onOpenSupport() : onNavigate('/support'))}
                className="flex items-center space-x-1 text-slate-300 hover:text-amber-400 transition text-xs font-semibold"
                title="Customer Support & Helpline"
              >
                <Headphones className="w-3.5 h-3.5 text-amber-400" />
                <span>Support</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 h-12 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4 relative min-w-0">
        {/* Brand Logo */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 min-w-0">
          <KitchenCruzeLogo
            size="md"
            variant="dark"
            customLogoUrl={settings.logo}
            onClick={() => onNavigate(isCustomerAuthenticated ? '/' : '/login')}
            className="hover:opacity-95 transition cursor-pointer"
          />
        </div>

        {/* Search Input (Visible on desktop) */}
        {isCustomerAuthenticated && onSearchChange && (
          <div className="hidden md:flex flex-1 max-w-md mx-3 lg:mx-6 relative min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="header-search-input"
              type="text"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-900 placeholder-slate-400 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
            />
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
          {/* Menu Link */}
          {isCustomerAuthenticated && (
            <button
              id="header-nav-menu"
              onClick={() => onNavigate('/menu')}
              className={`hidden md:inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors shrink-0 ${
                currentPath === '/menu'
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-slate-700 hover:text-amber-600 hover:bg-slate-50'
              }`}
            >
              {t('menu')}
            </button>
          )}

          {/* Offers Link */}
          {isCustomerAuthenticated && (
            <button
              id="header-nav-offers"
              onClick={() => onNavigate('/offers')}
              className={`hidden lg:inline-flex items-center space-x-1 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors shrink-0 ${
                currentPath === '/offers'
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-slate-700 hover:text-amber-600 hover:bg-slate-50'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{t('offers')}</span>
            </button>
          )}

          {/* Wishlist Link */}
          {isCustomerAuthenticated && (
            <button
              id="header-nav-wishlist"
              onClick={() => onNavigate('/wishlist')}
              className={`hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 text-sm font-semibold rounded-lg transition-colors shrink-0 ${
                currentPath === '/wishlist'
                  ? 'text-rose-600 bg-rose-50'
                  : 'text-slate-700 hover:text-rose-600 hover:bg-slate-50'
              }`}
              title={t('wishlist')}
            >
              <Heart className="w-4 h-4" />
            </button>
          )}

          {/* Orders History Link */}
          {isCustomerAuthenticated && (
            <button
              id="header-nav-orders"
              onClick={() => onNavigate('/orders')}
              className={`hidden lg:inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors shrink-0 ${
                currentPath.startsWith('/orders')
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-slate-700 hover:text-amber-600 hover:bg-slate-50'
              }`}
            >
              {t('orders')}
            </button>
          )}

          {/* Real-time Order Status Notification Center */}
          {isCustomerAuthenticated && (
            <NotificationBell onNavigate={onNavigate} />
          )}

          {/* Customer Wallet & Rewards Quick Access */}
          {isCustomerAuthenticated && (
            <button
              id="header-wallet-button"
              onClick={() => onNavigate('/wallet')}
              aria-label="Customer Wallet & Rewards"
              title={`Wallet Balance: ₹${(wallet?.balance ?? 0).toFixed(2)} | ${formatCoins(wallet?.coins ?? 0)} Coins`}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm transition-all shrink-0 border cursor-pointer active:scale-95 ${
                currentPath === '/wallet'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                  : 'bg-slate-100 hover:bg-amber-50 hover:border-amber-300 text-slate-800 border-slate-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-extrabold">₹{(wallet?.balance ?? 0).toFixed(2)}</span>
              {(wallet?.coins ?? 0) > 0 && (
                <span className="hidden sm:inline-flex items-center space-x-0.5 text-[10px] bg-amber-100/90 text-amber-800 px-1.5 py-0.5 rounded-full font-black">
                  <span>🪙</span>
                  <span>{formatCoins(wallet?.coins ?? 0)}</span>
                </span>
              )}
            </button>
          )}

          {/* Cart / Order Now Trigger */}
          {isCustomerAuthenticated && (
            <button
              id="header-cart-button"
              onClick={() => onNavigate('/cart')}
              aria-label="Order Now"
              title="Order Now"
              className={`relative flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm transition-all shadow-xs shrink-0 active:scale-95 cursor-pointer ${
                totalItemsCount > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 ring-2 ring-amber-400/20'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Order Now</span>
              {totalItemsCount > 0 && (
                <span className="bg-slate-900 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {totalItemsCount}
                </span>
              )}
            </button>
          )}

          {/* Customer Account or Sign In */}
          {isCustomerAuthenticated ? (
            <button
              id="header-account-button"
              onClick={() => onNavigate('/account')}
              className={`flex items-center space-x-1 sm:space-x-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition shrink-0 ${
                currentPath === '/account'
                  ? 'bg-slate-100 text-amber-600'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {customer?.avatar || customer?.profilePic ? (
                <img
                  src={customer.avatar || customer.profilePic}
                  alt={customer.fullName || 'User'}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-1.5 ring-amber-500/40 bg-amber-50 shadow-xs"
                />
              ) : (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px] sm:text-xs">
                  {customer?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="hidden lg:inline max-w-[90px] truncate">
                {customer?.fullName?.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              id="header-login-button"
              onClick={() => onNavigate('/login')}
              className="px-2.5 py-1 sm:px-4 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition shrink-0"
            >
              {t('login')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
