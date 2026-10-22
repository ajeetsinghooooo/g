import React, { useState } from 'react';
import {
  Wallet,
  RefreshCw,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { formatCoins, coinsToRupees } from '../utils/loyalty';

interface WalletViewProps {
  onNavigate: (path: string) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ onNavigate }) => {
  const { customer } = useAuth();
  const { wallet, transactions, rules, loading, refreshWallet, initiateTopup, verifyTopup, convertCoins } = useWallet();

  // Modals state
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [isConvertCoinsOpen, setIsConvertCoinsOpen] = useState(false);

  // Add Money Form State
  const [topupAmount, setTopupAmount] = useState<string>('200');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null);

  // Convert Coins Form State
  const [coinsToRedeem, setCoinsToRedeem] = useState<string>('50');
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  const availableBalance = wallet?.balance ?? 0;
  const availableCoins = wallet?.coins ?? 0;
  const purchasedBalance = wallet?.purchasedBalance ?? 0;
  const convertedBalance = wallet?.convertedBalance ?? 0;
  const cashbackBalance = wallet?.cashbackBalance ?? 0;

  const minTopup = rules.minTopupAmount || 10;
  const maxTopup = rules.maxTopupAmount || 10000;
  const minCoinsRedemption = rules.minCoinRedemption || 10;
  const conversionRate = rules.conversionRate || 10;

  // Handle Add Money Submit (Direct Razorpay Flow)
  const handleInitiateTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopupError(null);
    setTopupSuccess(null);
    const amount = Number(topupAmount);

    if (!amount || isNaN(amount) || amount < minTopup || amount > maxTopup) {
      setTopupError(`Please enter an amount between ₹${minTopup} and ₹${maxTopup}`);
      return;
    }

    setIsProcessingTopup(true);
    try {
      // 1. Create real Razorpay order on the server
      const res = await initiateTopup(amount);

      if (!res.razorpayOrderId || !res.keyId) {
        throw new Error(res.message || 'Razorpay order could not be generated.');
      }

      // Check if Razorpay script is loaded in browser
      if (typeof (window as any).Razorpay !== 'function') {
        throw new Error('Razorpay Checkout SDK is still loading. Please refresh and try again.');
      }

      // 2. Open official Razorpay Checkout modal
      const rzpOptions = {
        key: res.keyId,
        amount: res.amountPaise || Math.round(amount * 100),
        currency: res.currency || 'INR',
        name: 'Kitchen Cruze',
        description: `Wallet Top-up: ₹${amount}`,
        image: '/logo.png',
        order_id: res.razorpayOrderId,
        prefill: {
          name: customer?.fullName || res.customer?.name || 'Customer',
          email: customer?.email || res.customer?.email || '',
          contact: customer?.phone || res.customer?.contact || '',
        },
        notes: {
          type: 'WALLET_TOPUP',
          topupId: res.topupId,
          customerId: customer?.id || '',
        },
        theme: {
          color: '#f59e0b',
        },
        handler: async (response: any) => {
          setIsProcessingTopup(true);
          try {
            // 3. Verify payment signature on the server and credit wallet
            const verifyRes = await verifyTopup({
              topupId: res.topupId,
              amount,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setTopupSuccess(verifyRes.message || `₹${amount} added successfully to your wallet!`);
            setIsProcessingTopup(false);
            setTimeout(() => {
              setIsAddMoneyOpen(false);
              setTopupSuccess(null);
            }, 1600);
          } catch (err: any) {
            setTopupError(err.message || 'Payment verification failed on server');
            setIsProcessingTopup(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingTopup(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.on('payment.failed', (resp: any) => {
        setIsProcessingTopup(false);
        setTopupError(
          `Payment failed: ${resp.error?.description || 'Transaction was unsuccessful'}. No money was added to wallet.`
        );
      });
      rzp.open();
    } catch (err: any) {
      setTopupError(err.message || 'Failed to initialize Razorpay checkout');
      setIsProcessingTopup(false);
    }
  };

  // Handle Convert Coins Submit
  const handleConvertCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvertError(null);
    setConvertSuccess(null);
    const coins = Number(coinsToRedeem);

    if (!coins || coins < minCoinsRedemption) {
      setConvertError(`Minimum ${minCoinsRedemption} coins required to convert.`);
      return;
    }
    if (coins > availableCoins) {
      setConvertError(`You only have ${availableCoins} coins available.`);
      return;
    }

    setIsConverting(true);
    try {
      const res = await convertCoins(coins);
      setConvertSuccess(res.message || `Converted ${coins} coins into ₹${res.moneyCredited}!`);
      setTimeout(() => {
        setIsConvertCoinsOpen(false);
        setConvertSuccess(null);
      }, 1500);
    } catch (err: any) {
      setConvertError(err.message || 'Failed to convert coins');
    } finally {
      setIsConverting(false);
    }
  };

  const equivalentRupeesFromCoins = coinsToRupees(availableCoins, conversionRate);
  const coinsToConvertEquivalent = coinsToRupees(Number(coinsToRedeem) || 0, conversionRate);

  return (
    <div id="customer-wallet-view" className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Wallet &amp; Rewards
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your balance, coin rewards, and payment history
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => refreshWallet()}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-xl transition flex items-center space-x-1.5 text-xs font-semibold"
            title="Refresh balance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/menu')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <span>Order Food</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* 1. Primary Wallet Balance Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center space-x-1">
                <Wallet className="w-3.5 h-3.5" />
                <span>Cruze Wallet</span>
              </span>
              <div className="mt-2 flex items-baseline space-x-1">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  ₹{availableBalance.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 font-medium">available</span>
              </div>
            </div>

            <button
              type="button"
              id="wallet-add-money-btn"
              onClick={() => {
                setTopupError(null);
                setTopupSuccess(null);
                setIsAddMoneyOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Money</span>
            </button>
          </div>

          {/* Breakdown Pills */}
          <div className="pt-4 border-t border-slate-800/80 mt-4 grid grid-cols-3 gap-2 text-left relative z-10">
            <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40">
              <span className="text-[10px] text-slate-400 block font-medium">Added Funds</span>
              <span className="text-xs font-bold text-slate-200">₹{purchasedBalance.toFixed(2)}</span>
            </div>
            <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40">
              <span className="text-[10px] text-slate-400 block font-medium">Coin Rewards</span>
              <span className="text-xs font-bold text-amber-400">₹{convertedBalance.toFixed(2)}</span>
            </div>
            <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40">
              <span className="text-[10px] text-slate-400 block font-medium">Cashback</span>
              <span className="text-xs font-bold text-emerald-400">₹{cashbackBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 2. Reward Coins Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-6 rounded-3xl shadow-xl border border-amber-400/30 flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Loyalty Reward Coins</span>
              </span>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {formatCoins(availableCoins)}
                </span>
                <span className="text-xs text-amber-100 font-medium">
                  (= ₹{equivalentRupeesFromCoins.toFixed(2)})
                </span>
              </div>
            </div>

            <button
              type="button"
              id="wallet-convert-coins-btn"
              disabled={availableCoins < minCoinsRedemption}
              onClick={() => {
                setConvertError(null);
                setConvertSuccess(null);
                setCoinsToRedeem(Math.min(availableCoins, 50).toString());
                setIsConvertCoinsOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-300 font-black text-xs rounded-xl shadow-lg shadow-black/20 transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Convert to ₹</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="pt-4 border-t border-amber-400/40 mt-4 grid grid-cols-3 gap-2 text-left relative z-10">
            <div className="bg-amber-700/40 p-2.5 rounded-xl border border-amber-300/20 backdrop-blur-xs">
              <span className="text-[10px] text-amber-100 block font-medium">Total Earned</span>
              <span className="text-xs font-bold text-white">{formatCoins(wallet?.totalCoinsEarned || 0)}</span>
            </div>
            <div className="bg-amber-700/40 p-2.5 rounded-xl border border-amber-300/20 backdrop-blur-xs">
              <span className="text-[10px] text-amber-100 block font-medium">Total Converted</span>
              <span className="text-xs font-bold text-white">{formatCoins(wallet?.totalCoinsRedeemed || 0)}</span>
            </div>
            <div className="bg-amber-700/40 p-2.5 rounded-xl border border-amber-300/20 backdrop-blur-xs">
              <span className="text-[10px] text-amber-100 block font-medium">Conversion</span>
              <span className="text-xs font-bold text-white">{conversionRate} coins = ₹1</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Wallet Transactions Activity */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Recent Wallet Activity</h3>
          <span className="text-[11px] text-slate-400">Latest transactions</span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No transactions yet. Add money or earn coins when ordering!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 10).map((tx) => {
              const isCredit = tx.amount > 0 && tx.type !== 'PAYMENT' && tx.type !== 'PARTIAL_PAYMENT';
              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {tx.description || (tx.type === 'TOPUP' ? 'Wallet Top-up' : tx.type === 'COIN_CONVERT' ? 'Coins Converted' : 'Order Payment')}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(tx.timestamp || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-black text-xs ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {isCredit ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                    {tx.balanceAfter !== undefined && (
                      <span className="block text-[10px] text-slate-400">
                        Bal: ₹{tx.balanceAfter.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* MODAL 1: ADD MONEY (DIRECT RAZORPAY GATEWAY) */}
      {isAddMoneyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add Money to Wallet</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isProcessingTopup) {
                    setIsAddMoneyOpen(false);
                    setTopupError(null);
                    setTopupSuccess(null);
                  }
                }}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {topupError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <span className="font-semibold block leading-relaxed">{topupError}</span>
                  {topupError.includes('Missing environment variable') && (
                    <span className="block mt-1 text-[11px] text-rose-600/90 font-mono">
                      Please configure RAZORPAY_KEY_ID &amp; RAZORPAY_KEY_SECRET in server environment.
                    </span>
                  )}
                </div>
              </div>
            )}

            {topupSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{topupSuccess}</span>
              </div>
            )}

            <form onSubmit={handleInitiateTopup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Top-up Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={minTopup}
                    max={maxTopup}
                    step="1"
                    disabled={isProcessingTopup}
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>Min: ₹{minTopup} • Max: ₹{maxTopup}</span>
                </div>
              </div>

              {/* Quick amount chips */}
              <div className="flex flex-wrap gap-2">
                {[100, 200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={isProcessingTopup}
                    onClick={() => setTopupAmount(amt.toString())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer disabled:opacity-50 ${
                      topupAmount === amt.toString()
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="wallet-proceed-topup-btn"
                  disabled={isProcessingTopup}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingTopup ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Add ₹{topupAmount || '0'} via UPI</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center space-x-1 text-[11px] text-slate-400 text-center">
                <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Instant Wallet Credit</span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONVERT COINS TO MONEY */}
      {isConvertCoinsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Convert Coins to Money</h3>
                <p className="text-xs text-slate-500">
                  Rate: <strong>{conversionRate} coins = ₹1 wallet cash</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConvertCoinsOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {convertError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{convertError}</span>
              </div>
            )}

            {convertSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{convertSuccess}</span>
              </div>
            )}

            <form onSubmit={handleConvertCoins} className="space-y-4">
              <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-amber-700 font-bold block">Available to Redeem</span>
                  <span className="text-xl font-black text-slate-900">{formatCoins(availableCoins)} coins</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-amber-700 font-bold block">Total Cash Value</span>
                  <span className="text-xl font-black text-emerald-600">₹{equivalentRupeesFromCoins.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Coins to Convert
                </label>
                <input
                  type="number"
                  min={minCoinsRedemption}
                  max={availableCoins}
                  step="1"
                  value={coinsToRedeem}
                  onChange={(e) => setCoinsToRedeem(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  You will receive: <strong className="text-emerald-600">₹{coinsToConvertEquivalent.toFixed(2)}</strong> in wallet money
                </span>
              </div>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-2">
                {[50, 100, 250, 500].map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={availableCoins < c}
                    onClick={() => setCoinsToRedeem(c.toString())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      coinsToRedeem === c.toString()
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40'
                    }`}
                  >
                    {c} coins (₹{coinsToRupees(c, conversionRate)})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCoinsToRedeem(availableCoins.toString())}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                  Convert All
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isConverting || availableCoins < minCoinsRedemption}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isConverting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Convert {coinsToRedeem} Coins to ₹{coinsToConvertEquivalent}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
