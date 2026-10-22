import React from 'react';
import { Home, UtensilsCrossed, Clock, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useOrderNotification } from '../context/OrderNotificationContext';

interface MobileNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPath, onNavigate }) => {
  const { totalItemsCount } = useCart();
  const { t } = useSettings();
  const { unreadCount } = useOrderNotification();

  const navItems = [
    { label: t('home'), path: '/', icon: Home, id: 'mobile-nav-home' },
    { label: t('menu'), path: '/menu', icon: UtensilsCrossed, id: 'mobile-nav-menu' },
    {
      label: t('orders'),
      path: '/orders',
      icon: Clock,
      id: 'mobile-nav-orders',
      badge: unreadCount > 0 ? unreadCount : undefined,
      isNotification: true,
    },
    {
      label: t('cart'),
      path: '/cart',
      icon: ShoppingBag,
      id: 'mobile-nav-cart',
      badge: totalItemsCount,
    },
    { label: t('account'), path: '/account', icon: User, id: 'mobile-nav-account' },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5"
    >
      <div className="grid grid-cols-5 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.path);

          return (
            <button
              key={item.id}
              id={item.id}
              onClick={() => onNavigate(item.path)}
              className={`relative flex flex-col items-center justify-center py-1 transition-all ${
                isActive ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-amber-500' : 'text-slate-500'
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    id="mobile-cart-badge-count"
                    className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-white shadow-xs"
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight leading-none truncate max-w-[55px]">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-amber-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
