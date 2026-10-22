import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Coins,
  Gift,
  Search,
  Filter,
  Download,
  Plus,
  Minus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  FileText,
} from 'lucide-react';
import { CustomerWallet, WalletTransaction, Customer } from '../../types';
import { formatCoins, coinsToRupees } from '../../utils/loyalty';

interface WalletsManagementSectionProps {
  adminToken: string;
}

interface WalletWithCustomer extends CustomerWallet {
  customer?: Partial<Customer>;
}

export const WalletsManagementSection: React.FC<WalletsManagementSectionProps> = ({ adminToken }) => {
  const [wallets, setWallets] = useState<WalletWithCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<any>(null);

  // Modals state
  const [selectedWalletForAdjust, setSelectedWalletForAdjust] = useState<WalletWithCustomer | null>(null);
  const [selectedWalletForLedger, setSelectedWalletForLedger] = useState<WalletWithCustomer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Adjustment Form State
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustTarget, setAdjustTarget] = useState<'money' | 'coins'>('money');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  // Fetch Wallets & Stats
  const fetchWalletsData = useCallback(async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const [walletsRes, statsRes] = await Promise.all([
        fetch('/api/admin/wallets', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch('/api/admin/wallets/stats', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);

      if (walletsRes.ok) {
        const data = await walletsRes.json();
        setWallets(Array.isArray(data) ? data : []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load admin wallet data:', err);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchWalletsData();
  }, [fetchWalletsData]);

  // Fetch Customer Transactions for Ledger Modal
  const openCustomerLedger = async (wallet: WalletWithCustomer) => {
    setSelectedWalletForLedger(wallet);
    setLoadingTransactions(true);
    try {
      const res = await fetch(`/api/admin/wallets/${wallet.customerId}/transactions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const txs = await res.json();
        setCustomerTransactions(Array.isArray(txs) ? txs : []);
      }
    } catch (err) {
      console.error('Failed to load transactions for customer:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Submit Manual Adjustment
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletForAdjust) return;

    const numAmount = parseFloat(adjustAmount);
    if (!numAmount || numAmount <= 0) {
      setAdjustError('Please enter an amount greater than zero');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('A mandatory administrative audit reason is required');
      return;
    }

    setIsSubmittingAdjust(true);
    setAdjustError(null);
    setAdjustSuccess(null);

    try {
      const res = await fetch('/api/admin/wallets/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          customerId: selectedWalletForAdjust.customerId,
          type: adjustType,
          target: adjustTarget,
          amount: numAmount,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust wallet');
      }

      setAdjustSuccess(data.message || 'Wallet adjusted successfully!');
      setTimeout(() => {
        setSelectedWalletForAdjust(null);
        setAdjustAmount('');
        setAdjustReason('');
        setAdjustSuccess(null);
        fetchWalletsData();
      }, 1400);
    } catch (err: any) {
      setAdjustError(err.message || 'Error executing adjustment');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Filter Wallets
  const filteredWallets = wallets.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = w.customer?.fullName?.toLowerCase() || '';
    const phone = w.customer?.phone?.toLowerCase() || '';
    const email = w.customer?.email?.toLowerCase() || '';
    const id = w.customerId.toLowerCase();
    return name.includes(q) || phone.includes(q) || email.includes(q) || id.includes(q);
  });

  // Export CSV
  const handleExportCsv = () => {
    if (filteredWallets.length === 0) return;
    const headers = [
      'Customer ID',
      'Customer Name',
      'Phone',
      'Email',
      'Available Balance (INR)',
      'Purchased Balance',
      'Converted Balance',
      'Cashback Balance',
      'Available Coins',
      'Total Coins Earned',
      'Total Money Added',
      'Total Money Spent',
      'Created At',
    ];

    const rows = filteredWallets.map((w) => [
      w.customerId,
      `"${w.customer?.fullName || 'Customer'}"`,
      `"${w.customer?.phone || ''}"`,
      `"${w.customer?.email || ''}"`,
      w.balance.toFixed(2),
      w.purchasedBalance.toFixed(2),
      w.convertedBalance.toFixed(2),
      w.cashbackBalance.toFixed(2),
      w.coins,
      w.totalCoinsEarned,
      w.totalMoneyAdded.toFixed(2),
      w.totalMoneySpent.toFixed(2),
      w.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kitchen_cruze_wallets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-amber-500" />
            <span>Customer Wallets &amp; Financial Ledger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real balances, coin liabilities, audit records and administrative balance controls
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchWalletsData}
            disabled={loading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            title="Refresh wallets data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredWallets.length === 0}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition shadow-md shadow-amber-500/20 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Liability KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Active Wallets</span>
          <span className="text-xl font-black text-white block mt-1">
            {stats?.totalCustomersWithWallets || wallets.length}
          </span>
          <span className="text-[10px] text-slate-500">Registered users</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cash Circulation</span>
          <span className="text-xl font-black text-emerald-400 block mt-1">
            ₹{stats?.totalBalanceCirculation ? stats.totalBalanceCirculation.toFixed(2) : '0.00'}
          </span>
          <span className="text-[10px] text-slate-500">Live customer funds</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Coin Holdings</span>
          <span className="text-xl font-black text-amber-400 block mt-1">
            {formatCoins(stats?.totalCoinsCirculation || 0)} 🪙
          </span>
          <span className="text-[10px] text-slate-500">
            (= ₹{stats?.coinLiabilityRupees ? stats.coinLiabilityRupees.toFixed(2) : '0.00'} liability)
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Added</span>
          <span className="text-xl font-black text-blue-400 block mt-1">
            ₹{stats?.totalMoneyAdded ? stats.totalMoneyAdded.toFixed(2) : '0.00'}
          </span>
          <span className="text-[10px] text-slate-500">Verified top-ups</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Wallet Spent</span>
          <span className="text-xl font-black text-purple-400 block mt-1">
            ₹{stats?.totalMoneySpent ? stats.totalMoneySpent.toFixed(2) : '0.00'}
          </span>
          <span className="text-[10px] text-slate-500">Orders checkout</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cashback Awarded</span>
          <span className="text-xl font-black text-teal-400 block mt-1">
            ₹{stats?.totalCashbackEarned ? stats.totalCashbackEarned.toFixed(2) : '0.00'}
          </span>
          <span className="text-[10px] text-slate-500">Promotions total</span>
        </div>
      </div>

      {/* Search and Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer name, phone, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-2">
          <span>Showing <strong>{filteredWallets.length}</strong> of {wallets.length} customer wallets</span>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Available Cash</th>
                <th className="py-3 px-4">Funds Breakdown</th>
                <th className="py-3 px-4">Reward Coins</th>
                <th className="py-3 px-4">Added / Spent</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredWallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <Wallet className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-bold">No customer wallets found</p>
                    <p className="text-[11px]">When customers sign up, wallets are automatically created with ₹0 balance.</p>
                  </td>
                </tr>
              ) : (
                filteredWallets.map((w) => (
                  <tr key={w.customerId} className="hover:bg-slate-800/40 transition">
                    {/* Customer Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {w.customer?.fullName?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">
                            {w.customer?.fullName || 'Registered Customer'}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate font-mono">
                            {w.customer?.phone || w.customer?.email || w.customerId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Available Balance */}
                    <td className="py-3 px-4">
                      <span className="text-sm font-extrabold text-emerald-400 block">
                        ₹{w.balance.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">available</span>
                    </td>

                    {/* Funds Breakdown */}
                    <td className="py-3 px-4 text-[11px]">
                      <div className="space-y-0.5">
                        <span className="text-slate-300 block">
                          Top-Up: <strong>₹{w.purchasedBalance.toFixed(2)}</strong>
                        </span>
                        <span className="text-amber-400 block">
                          Converted: <strong>₹{w.convertedBalance.toFixed(2)}</strong>
                        </span>
                        <span className="text-teal-400 block">
                          Cashback: <strong>₹{w.cashbackBalance.toFixed(2)}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Reward Coins */}
                    <td className="py-3 px-4">
                      <div className="flex items-baseline space-x-1">
                        <span className="font-extrabold text-amber-400 text-sm">
                          {formatCoins(w.coins)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          (= ₹{coinsToRupees(w.coins).toFixed(2)})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Earned: {formatCoins(w.totalCoinsEarned)} | Conv: {formatCoins(w.totalCoinsRedeemed)}
                      </span>
                    </td>

                    {/* Added / Spent */}
                    <td className="py-3 px-4 text-[11px]">
                      <div className="space-y-0.5">
                        <span className="text-slate-300 block">
                          + Added: <strong>₹{w.totalMoneyAdded.toFixed(2)}</strong>
                        </span>
                        <span className="text-rose-400 block">
                          - Spent: <strong>₹{w.totalMoneySpent.toFixed(2)}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustError(null);
                            setAdjustSuccess(null);
                            setAdjustAmount('');
                            setAdjustReason('');
                            setSelectedWalletForAdjust(w);
                          }}
                          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-[11px] font-bold transition flex items-center space-x-1"
                          title="Manual balance adjustment"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adjust</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openCustomerLedger(w)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition flex items-center space-x-1"
                          title="View complete transaction history"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Ledger</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADMINISTRATIVE ADJUSTMENT */}
      {selectedWalletForAdjust && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 text-white shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <span>Manual Wallet Adjustment</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audited adjustment for {selectedWalletForAdjust.customer?.fullName || selectedWalletForAdjust.customerId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWalletForAdjust(null)}
                className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            {adjustSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{adjustSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
              {/* Type: Credit vs Debit */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('credit')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      adjustType === 'credit'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Credit (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('debit')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      adjustType === 'debit'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Debit (-)</span>
                  </button>
                </div>
              </div>

              {/* Target: Money vs Coins */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Asset Target</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustTarget('money')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      adjustTarget === 'money'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Rupees (₹)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustTarget('coins')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      adjustTarget === 'coins'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Coins (🪙)</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Amount {adjustTarget === 'money' ? 'in Rupees (₹)' : 'in Reward Coins'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step={adjustTarget === 'money' ? '0.01' : '0.5'}
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder={adjustTarget === 'money' ? 'e.g. 100' : 'e.g. 50'}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Current Balance: ₹{selectedWalletForAdjust.balance.toFixed(2)} | Coins: {formatCoins(selectedWalletForAdjust.coins)}
                </p>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mandatory Audit Reason <span className="text-amber-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Compensation for delayed order #KC-1049, goodwill credit, or account reconciliation"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This reason is permanently saved to the security audit trail.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdjust ? 'Executing...' : `Confirm ${adjustType.toUpperCase()} ${adjustAmount || '0'} ${adjustTarget === 'money' ? '₹' : 'Coins'}`}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWalletForAdjust(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOMER TRANSACTION LEDGER */}
      {selectedWalletForLedger && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 text-white shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <span>Customer Transaction Ledger</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete ledger for {selectedWalletForLedger.customer?.fullName || selectedWalletForLedger.customerId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWalletForLedger(null)}
                className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Balances Header */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Wallet Balance</span>
                <span className="text-lg font-black text-emerald-400">₹{selectedWalletForLedger.balance.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Reward Coins</span>
                <span className="text-lg font-black text-amber-400">{formatCoins(selectedWalletForLedger.coins)} coins</span>
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800 pr-1 space-y-1">
              {loadingTransactions ? (
                <div className="text-center py-10 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                  <span className="text-xs">Loading ledger entries...</span>
                </div>
              ) : customerTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No transactions recorded for this customer yet.
                </div>
              ) : (
                customerTransactions.map((tx) => {
                  const isCredit = tx.type === 'TOPUP' || tx.type === 'COIN_CONVERT' || tx.type === 'CASHBACK_CREDIT' || tx.type === 'REFUND';
                  return (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white truncate">{tx.description}</span>
                          {tx.orderId && (
                            <span className="px-1.5 py-0.5 bg-slate-800 text-amber-400 text-[10px] font-mono rounded">
                              {tx.orderId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{new Date(tx.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{tx.id}</span>
                          {tx.adminUsername && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 font-semibold">By: {tx.adminUsername}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {tx.type === 'COIN_EARN' ? (
                          <span className="text-amber-400 font-extrabold block">
                            +{formatCoins(tx.coins || 0)} coins
                          </span>
                        ) : (
                          <span className={`font-extrabold block ${isCredit ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {isCredit ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 block">
                          After: ₹{tx.balanceAfter.toFixed(2)} ({formatCoins(tx.coinsAfter)} coins)
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setSelectedWalletForLedger(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
