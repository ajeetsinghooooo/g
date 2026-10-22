import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerWallet, WalletTransaction, LoyaltySettings } from '../types';
import { useAuth } from './AuthContext';
import { DEFAULT_LOYALTY_RULES } from '../utils/loyalty';

import { safeJson, apiFetch } from '../utils/api';

interface WalletContextType {
  wallet: CustomerWallet | null;
  transactions: WalletTransaction[];
  rules: LoyaltySettings;
  loading: boolean;
  refreshWallet: () => Promise<void>;
  initiateTopup: (amount: number) => Promise<{
    success: boolean;
    topupId: string;
    amount: number;
    amountPaise?: number;
    currency: string;
    razorpayOrderId?: string;
    keyId?: string;
    gatewayConfigured?: boolean;
    customer?: { name?: string; email?: string; contact?: string };
    message?: string;
  }>;
  verifyTopup: (payload: {
    topupId: string;
    amount: number;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => Promise<{ success: boolean; message: string; wallet?: CustomerWallet; alreadyCredited?: boolean }>;
  convertCoins: (coins: number) => Promise<{ success: boolean; message: string; moneyCredited?: number }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { customerToken, isCustomerAuthenticated } = useAuth();
  const [wallet, setWallet] = useState<CustomerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [rules, setRules] = useState<LoyaltySettings>({ ...DEFAULT_LOYALTY_RULES });
  const [loading, setLoading] = useState<boolean>(false);

  const refreshWallet = useCallback(async () => {
    const effectiveToken = customerToken || localStorage.getItem('kc_customer_token');
    if (!effectiveToken) {
      setWallet(null);
      setTransactions([]);
      return;
    }

    try {
      setLoading(true);
      const [walletRes, txsRes] = await Promise.all([
        apiFetch('/api/customer/wallet', {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        }),
        apiFetch('/api/customer/wallet/transactions', {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        }),
      ]);

      if (walletRes.ok) {
        const data = await safeJson(walletRes).catch(() => null);
        if (data) {
          setWallet(data.wallet || null);
          if (data.rules) {
            setRules(data.rules);
          }
        }
      }

      if (txsRes.ok) {
        const txsData = await safeJson(txsRes).catch(() => []);
        setTransactions(Array.isArray(txsData) ? txsData : []);
      }
    } catch (err) {
      console.warn('Could not refresh wallet details:', err);
    } finally {
      setLoading(false);
    }
  }, [customerToken]);

  useEffect(() => {
    if (isCustomerAuthenticated) {
      refreshWallet();
    } else {
      setWallet(null);
      setTransactions([]);
    }
  }, [isCustomerAuthenticated, refreshWallet]);

  // Connect to SSE stream for real-time wallet updates
  useEffect(() => {
    if (!isCustomerAuthenticated) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'WALLET_UPDATE') {
            refreshWallet();
          }
        } catch {
          // Ignore parse errors
        }
      };
    } catch {
      // EventSource fallback
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isCustomerAuthenticated, refreshWallet]);

  const initiateTopup = async (amount: number) => {
    const effectiveToken = customerToken || localStorage.getItem('kc_customer_token');
    if (!effectiveToken) throw new Error('Authentication required');

    const res = await apiFetch('/api/customer/wallet/topup/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveToken}`,
      },
      body: JSON.stringify({ amount }),
    });

    return await safeJson(res, 'Failed to initiate top-up');
  };

  const verifyTopup = async (payload: {
    topupId: string;
    amount: number;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    paymentReference?: string;
    paymentMethod?: string;
  }) => {
    const effectiveToken = customerToken || localStorage.getItem('kc_customer_token');
    if (!effectiveToken) throw new Error('Authentication required');

    const res = await apiFetch('/api/customer/wallet/topup/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(res, 'Failed to verify top-up');

    if (data.wallet) {
      setWallet(data.wallet);
    }
    await refreshWallet();
    return data;
  };

  const convertCoins = async (coins: number) => {
    const effectiveToken = customerToken || localStorage.getItem('kc_customer_token');
    if (!effectiveToken) throw new Error('Authentication required');

    const res = await apiFetch('/api/customer/wallet/convert-coins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveToken}`,
      },
      body: JSON.stringify({ coins }),
    });

    const data = await safeJson(res, 'Failed to convert coins');

    if (data.wallet) {
      setWallet(data.wallet);
    }
    await refreshWallet();
    return data;
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        transactions,
        rules,
        loading,
        refreshWallet,
        initiateTopup,
        verifyTopup,
        convertCoins,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
