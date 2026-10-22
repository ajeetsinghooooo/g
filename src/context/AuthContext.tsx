import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Customer, StaffUser } from '../types';
import { safeJson, apiFetch } from '../utils/api';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase';

interface AuthContextType {
  // Customer state
  customer: Customer | null;
  customerToken: string | null;
  isCustomerAuthenticated: boolean;
  loginCustomer: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  registerCustomer: (data: {
    fullName: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    initialAddress?: any;
    preferredLanguage?: any;
  }) => Promise<{ success: boolean; error?: string }>;
  logoutCustomer: () => void;
  updateCustomerProfile: (data: Partial<Customer>) => Promise<boolean>;
  updateProfile: (data: Partial<Customer>) => Promise<boolean>;

  // Staff roles (Admin, Chef, Delivery)
  staffUser: StaffUser | null;
  staffToken: string | null;
  adminToken: string | null;
  adminEmail: string | null;
  isAdminAuthenticated: boolean;
  isChefAuthenticated: boolean;
  isDeliveryAuthenticated: boolean;
  loginStaff: (username: string, pass: string, expectedRole?: 'admin' | 'chef' | 'delivery') => Promise<{ success: boolean; role?: string; error?: string }>;
  logoutStaff: () => void;
  logoutAdmin: () => void;

  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem('kc_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [customerToken, setCustomerToken] = useState<string | null>(() => {
    return localStorage.getItem('kc_customer_token') || null;
  });

  const [staffUser, setStaffUser] = useState<StaffUser | null>(() => {
    try {
      const saved = localStorage.getItem('kc_staff_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [staffToken, setStaffToken] = useState<string | null>(() => {
    return localStorage.getItem('kc_staff_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // Sync customer session
  useEffect(() => {
    const checkCustomer = async () => {
      if (customerToken) {
        try {
          const res = await apiFetch('/api/customer/me', {
            headers: { Authorization: `Bearer ${customerToken}` },
          });
          if (res.ok) {
            const data = await safeJson(res).catch(() => null);
            if (data) {
              setCustomer(data);
              localStorage.setItem('kc_customer', JSON.stringify(data));
            }
          } else {
            setCustomer(null);
            setCustomerToken(null);
            localStorage.removeItem('kc_customer');
            localStorage.removeItem('kc_customer_token');
          }
        } catch (err) {
          console.error('Session verify failed:', err);
        }
      }
      setLoading(false);
    };

    checkCustomer();
  }, [customerToken]);

  const loginCustomer = async (identifier: string, pass: string) => {
    try {
      const res = await apiFetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass }),
      });
      const data = await safeJson(res, 'Failed to login');
      setCustomer(data.customer);
      setCustomerToken(data.token);
      localStorage.setItem('kc_customer', JSON.stringify(data.customer));
      localStorage.setItem('kc_customer_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error occurred' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (!user || !user.email) {
        return { success: false, error: 'Could not retrieve email from Google Account' };
      }
      const res = await apiFetch('/api/customer/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          fullName: user.displayName || user.email.split('@')[0],
          firebaseUid: user.uid,
          photoUrl: user.photoURL || undefined,
        }),
      });
      const data = await safeJson(res, 'Google Sign-in failed');
      setCustomer(data.customer);
      setCustomerToken(data.token);
      localStorage.setItem('kc_customer', JSON.stringify(data.customer));
      localStorage.setItem('kc_customer_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Google Sign-in cancelled or failed' };
    }
  };

  const registerCustomer = async (formData: {
    fullName: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    initialAddress?: any;
    preferredLanguage?: any;
  }) => {
    try {
      const res = await apiFetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await safeJson(res, 'Failed to create customer account');
      setCustomer(data.customer);
      setCustomerToken(data.token);
      localStorage.setItem('kc_customer', JSON.stringify(data.customer));
      localStorage.setItem('kc_customer_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error occurred' };
    }
  };

  const logoutCustomer = () => {
    setCustomer(null);
    setCustomerToken(null);
    localStorage.removeItem('kc_customer');
    localStorage.removeItem('kc_customer_token');
    try {
      signOut(auth).catch(() => {});
    } catch {}
  };

  const updateCustomerProfile = async (updates: Partial<Customer>): Promise<boolean> => {
    if (!customerToken) return false;
    try {
      const res = await apiFetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await safeJson(res).catch(() => null);
        if (data) {
          setCustomer(data);
          localStorage.setItem('kc_customer', JSON.stringify(data));
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const loginStaff = async (username: string, pass: string, expectedRole?: 'admin' | 'chef' | 'delivery') => {
    try {
      const res = await apiFetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass, expectedRole }),
      });
      const data = await safeJson(res, 'Login failed');
      setStaffUser(data.user);
      setStaffToken(data.token);
      localStorage.setItem('kc_staff_user', JSON.stringify(data.user));
      localStorage.setItem('kc_staff_token', data.token);
      return { success: true, role: data.user.role };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server error' };
    }
  };

  const logoutStaff = () => {
    setStaffUser(null);
    setStaffToken(null);
    localStorage.removeItem('kc_staff_user');
    localStorage.removeItem('kc_staff_token');
  };

  const isAdminAuthenticated = Boolean(staffToken && staffUser && staffUser.role === 'admin');
  const isChefAuthenticated = Boolean(staffToken && staffUser && (staffUser.role === 'chef' || staffUser.role === 'admin'));
  const isDeliveryAuthenticated = Boolean(staffToken && staffUser && (staffUser.role === 'delivery' || staffUser.role === 'admin'));

  return (
    <AuthContext.Provider
      value={{
        customer,
        customerToken,
        isCustomerAuthenticated: Boolean(customerToken && customer),
        loginCustomer,
        loginWithGoogle,
        registerCustomer,
        logoutCustomer,
        updateCustomerProfile,
        updateProfile: updateCustomerProfile,

        staffUser,
        staffToken,
        adminToken: staffUser?.role === 'admin' ? staffToken : null,
        adminEmail: staffUser?.role === 'admin' ? (staffUser.email || staffUser.username) : null,
        isAdminAuthenticated,
        isChefAuthenticated,
        isDeliveryAuthenticated,
        loginStaff,
        logoutStaff,
        logoutAdmin: logoutStaff,

        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
