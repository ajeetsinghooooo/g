import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';
import { OrderNotificationProvider } from './context/OrderNotificationContext';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { Footer } from './components/Footer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { OrderStatusToast } from './components/notifications/OrderStatusToast';
import { CustomerSupportModal } from './components/CustomerSupportModal';
import { FloatingSupportButton } from './components/FloatingSupportButton';

// Customer Views
import { CustomerLoginView } from './views/CustomerLoginView';
import { CustomerSignupView } from './views/CustomerSignupView';
import { HomeView } from './views/HomeView';
import { MenuView } from './views/MenuView';
import { CartView } from './views/CartView';
import { CheckoutView } from './views/CheckoutView';
import { OrdersView } from './views/OrdersView';
import { OrderDetailView } from './views/OrderDetailView';
import { AccountView } from './views/AccountView';
import { ProductDetailView } from './views/ProductDetailView';
import { WishlistView } from './views/WishlistView';
import { OffersView } from './views/OffersView';
import { SupportView } from './views/SupportView';
import { WalletView } from './views/WalletView';
import { WalletProvider } from './context/WalletContext';

// Staff & Operations Views
import { AdminLoginView } from './views/admin/AdminLoginView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { ChefLoginView } from './views/ChefLoginView';
import { ChefDashboardView } from './views/ChefDashboardView';
import { DeliveryLoginView } from './views/DeliveryLoginView';
import { DeliveryDashboardView } from './views/DeliveryDashboardView';

import { Product } from './types';

const MainApp: React.FC = () => {
  const {
    isCustomerAuthenticated,
    isAdminAuthenticated,
    isChefAuthenticated,
    isDeliveryAuthenticated,
    loading,
  } = useAuth();

  // Internal hash/path router
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.hash ? window.location.hash.replace('#', '') : '/login';
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportOrderId, setSupportOrderId] = useState<string | null>(null);

  // Handle URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        if (hash.startsWith('/orders/') && hash !== '/orders/detail') {
          const id = hash.replace('/orders/', '');
          setActiveOrderId(id);
          setCurrentPath('/orders/detail');
        } else if (hash.startsWith('/product/')) {
          const prodId = hash.replace('/product/', '');
          setActiveProductId(prodId);
          setCurrentPath('/product/detail');
        } else {
          setCurrentPath(hash);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (path.startsWith('/orders/') && path !== '/orders' && path !== '/orders/detail') {
      const id = path.replace('/orders/', '');
      setActiveOrderId(id);
      setCurrentPath('/orders/detail');
      window.location.hash = path;
    } else if (path.startsWith('/product/')) {
      const prodId = path.replace('/product/', '');
      setActiveProductId(prodId);
      setCurrentPath('/product/detail');
      window.location.hash = path;
    } else {
      setCurrentPath(path);
      window.location.hash = path;
    }
  };

  // Enforcement of: "LOGIN MUST COME FIRST"
  // When anyone opens the website, the first page must be Customer Login page.
  // The main website, menu, and customer pages are NOT accessible before login.
  useEffect(() => {
    if (!loading) {
      const isStaffPath =
        currentPath.startsWith('/admin') ||
        currentPath.startsWith('/chef') ||
        currentPath.startsWith('/delivery');

      if (isStaffPath) {
        // Handle admin route protection
        if (currentPath === '/admin' && !isAdminAuthenticated) {
          navigate('/admin/login');
        }
        // Handle chef route protection
        if (currentPath === '/chef' && !isChefAuthenticated && !isAdminAuthenticated) {
          navigate('/chef-login');
        }
        // Handle delivery route protection
        if (currentPath === '/delivery' && !isDeliveryAuthenticated && !isAdminAuthenticated) {
          navigate('/delivery-login');
        }
      } else {
        // Customer side
        if (!isCustomerAuthenticated && currentPath !== '/login' && currentPath !== '/signup') {
          navigate('/login');
        } else if (isCustomerAuthenticated && (currentPath === '/login' || currentPath === '/signup')) {
          navigate('/');
        }
      }
    }
  }, [
    isCustomerAuthenticated,
    isAdminAuthenticated,
    isChefAuthenticated,
    isDeliveryAuthenticated,
    currentPath,
    loading,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-slate-300 font-mono text-xs tracking-wider">
          Initializing Kitchen Cruze...
        </span>
      </div>
    );
  }

  // 1. Admin Portal Routes
  if (currentPath === '/admin/login' || currentPath === '/admin-login') {
    return <AdminLoginView onNavigate={navigate} />;
  }

  if (currentPath === '/admin') {
    if (!isAdminAuthenticated) {
      return <AdminLoginView onNavigate={navigate} />;
    }
    return <AdminDashboardView onNavigate={navigate} />;
  }

  // 2. Chef Kitchen Portal Routes
  if (currentPath === '/chef/login' || currentPath === '/chef-login') {
    return <ChefLoginView onNavigate={navigate} />;
  }

  if (currentPath === '/chef') {
    if (!isChefAuthenticated && !isAdminAuthenticated) {
      return <ChefLoginView onNavigate={navigate} />;
    }
    return <ChefDashboardView onNavigate={navigate} />;
  }

  // 3. Delivery Fleet Portal Routes
  if (currentPath === '/delivery/login' || currentPath === '/delivery-login') {
    return <DeliveryLoginView onNavigate={navigate} />;
  }

  if (currentPath === '/delivery') {
    if (!isDeliveryAuthenticated && !isAdminAuthenticated) {
      return <DeliveryLoginView onNavigate={navigate} />;
    }
    return <DeliveryDashboardView onNavigate={navigate} />;
  }

  // 4. Customer Login & Registration Routes (Requirement 2)
  if (currentPath === '/login') {
    return <CustomerLoginView onNavigate={navigate} />;
  }

  if (currentPath === '/signup') {
    return <CustomerSignupView onNavigate={navigate} />;
  }

  // 5. Main Customer Application (Protected by Customer Auth)
  const renderCustomerView = () => {
    switch (currentPath) {
      case '/':
        return (
          <HomeView
            onNavigate={navigate}
            onOpenProductDetails={(prod) => setSelectedProduct(prod)}
          />
        );
      case '/menu':
        return (
          <MenuView
            onOpenProductDetails={(prod) => setSelectedProduct(prod)}
            initialSearch={globalSearch}
          />
        );
      case '/cart':
        return <CartView onNavigate={navigate} />;
      case '/checkout':
        return (
          <CheckoutView
            onNavigate={navigate}
            onOrderSuccess={(orderId) => {
              navigate(`/orders/${orderId}`);
            }}
          />
        );
      case '/orders':
        return (
          <OrdersView
            onNavigate={navigate}
            onSelectOrder={(id) => navigate(`/orders/${id}`)}
          />
        );
      case '/orders/detail':
        return activeOrderId ? (
          <OrderDetailView
            orderId={activeOrderId}
            onNavigate={navigate}
            onOpenSupport={(id) => {
              setSupportOrderId(id || activeOrderId);
              setIsSupportModalOpen(true);
            }}
          />
        ) : (
          <OrdersView
            onNavigate={navigate}
            onSelectOrder={(id) => navigate(`/orders/${id}`)}
          />
        );
      case '/product/detail':
        return activeProductId ? (
          <ProductDetailView productId={activeProductId} onNavigate={navigate} />
        ) : (
          <MenuView
            onOpenProductDetails={(prod) => setSelectedProduct(prod)}
            initialSearch={globalSearch}
          />
        );
      case '/wishlist':
        return <WishlistView onNavigate={navigate} />;
      case '/offers':
        return <OffersView onNavigate={navigate} />;
      case '/account':
        return <AccountView onNavigate={navigate} />;
      case '/wallet':
        return <WalletView onNavigate={navigate} />;
      case '/support':
        return <SupportView onNavigate={navigate} />;
      default:
        return (
          <HomeView
            onNavigate={navigate}
            onOpenProductDetails={(prod) => setSelectedProduct(prod)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-amber-500 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Top Header with Brand Logo, Search, Delivery/Pickup, Language & Cart */}
      <Header
        currentPath={currentPath}
        onNavigate={navigate}
        searchQuery={globalSearch}
        onSearchChange={(q) => {
          setGlobalSearch(q);
          if (currentPath !== '/menu') {
            navigate('/menu');
          }
        }}
        onOpenSupport={() => {
          setSupportOrderId(null);
          setIsSupportModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-20 md:pb-8">
        {renderCustomerView()}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav currentPath={currentPath} onNavigate={navigate} />

      {/* Footer */}
      <Footer
        onNavigate={navigate}
        onOpenSupport={() => {
          setSupportOrderId(null);
          setIsSupportModalOpen(true);
        }}
      />

      {/* Customer Support Modal */}
      <CustomerSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => {
          setIsSupportModalOpen(false);
          setSupportOrderId(null);
        }}
        orderId={supportOrderId}
        onNavigate={navigate}
      />

      {/* Floating Customer Support Button */}
      <FloatingSupportButton
        onOpenSupport={() => {
          setSupportOrderId(null);
          setIsSupportModalOpen(true);
        }}
      />

      {/* Product Customization & Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Real-time Order Status Visual Alert Toast */}
      <OrderStatusToast onNavigate={navigate} />
    </div>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <WalletProvider>
          <OrderNotificationProvider>
            <CartProvider>
              <MainApp />
            </CartProvider>
          </OrderNotificationProvider>
        </WalletProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
