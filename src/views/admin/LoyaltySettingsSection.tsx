import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  DollarSign,
  HelpCircle,
  ShieldCheck,
  Calculator,
} from 'lucide-react';
import { LoyaltySettings } from '../../types';
import { DEFAULT_LOYALTY_RULES, calculateRewardCoins, formatCoins } from '../../utils/loyalty';

interface LoyaltySettingsSectionProps {
  adminToken: string;
}

export const LoyaltySettingsSection: React.FC<LoyaltySettingsSectionProps> = ({ adminToken }) => {
  const [settings, setSettings] = useState<LoyaltySettings>({ ...DEFAULT_LOYALTY_RULES });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Formula Simulator
  const [testSubtotal, setTestSubtotal] = useState<string>('150');
  const [testDiscount, setTestDiscount] = useState<string>('0');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!adminToken) return;
      try {
        setLoading(true);
        const res = await fetch('/api/admin/loyalty/settings', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...DEFAULT_LOYALTY_RULES, ...data });
        }
      } catch (err) {
        console.error('Failed to load loyalty settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [adminToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/loyalty/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save loyalty settings');
      }

      setSettings(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  // Run calculation on test values using current settings
  const simulatedCalc = calculateRewardCoins(
    Number(testSubtotal) || 0,
    Number(testDiscount) || 0,
    settings
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Loyalty Reward Rules &amp; Coin Configuration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure the mandatory ₹100 minimum threshold, coin earning rate, conversion value, and top-up limits
          </p>
        </div>

        {saveSuccess && (
          <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 animate-pulse bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
            <span>Rules Updated Successfully!</span>
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Rules Section */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-4">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Reward Earning &amp; Conversion Rules</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Minimum Eligible Order Amount */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                Minimum Eligible Order (₹) <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={settings.minEligibleOrderAmount}
                  onChange={(e) =>
                    setSettings({ ...settings, minEligibleOrderAmount: Number(e.target.value) || 100 })
                  }
                  required
                  className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Mandatory minimum merchandise subtotal required to qualify for reward coins (Default: ₹100).
              </p>
            </div>

            {/* 2. Earning Rate */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                Earning Rate (Coins per ₹1) <span className="text-amber-400">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.05"
                value={settings.earningRate}
                onChange={(e) =>
                  setSettings({ ...settings, earningRate: parseFloat(e.target.value) || 0.5 })
                }
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-400">
                0.5 means 50 coins awarded for ₹100 eligible merchandise (Default: 0.5).
              </p>
            </div>

            {/* 3. Conversion Rate */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                Conversion Rate (Coins per ₹1) <span className="text-amber-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={settings.conversionRate}
                onChange={(e) =>
                  setSettings({ ...settings, conversionRate: Number(e.target.value) || 10 })
                }
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-400">
                10 means 10 coins convert to ₹1 wallet balance (Default: 10 coins = ₹1).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Min Coin Redemption */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                Minimum Coin Redemption
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={settings.minCoinRedemption || 10}
                onChange={(e) =>
                  setSettings({ ...settings, minCoinRedemption: Number(e.target.value) || 10 })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-400">
                Minimum coins a customer must have before converting to wallet cash (Default: 10).
              </p>
            </div>

            {/* Min Top-up Amount */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                Min Wallet Top-up (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={settings.minTopupAmount || 10}
                  onChange={(e) =>
                    setSettings({ ...settings, minTopupAmount: Number(e.target.value) || 10 })
                  }
                  className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Minimum single amount customer can add to wallet (Default: ₹10).
              </p>
            </div>

            {/* Max Top-up Amount */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                Max Wallet Top-up (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="100"
                  step="500"
                  value={settings.maxTopupAmount || 10000}
                  onChange={(e) =>
                    setSettings({ ...settings, maxTopupAmount: Number(e.target.value) || 10000 })
                  }
                  className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Maximum single amount customer can add to wallet (Default: ₹10,000).
              </p>
            </div>
          </div>
        </div>

        {/* Exclusion & Qualification Rules */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-4">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Eligible Subtotal Criteria (Requirement 4)</span>
          </h3>
          <p className="text-xs text-slate-400">
            By default, rewards are calculated on merchandise subtotal after discounts. Select fees to exclude from reward qualification:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.excludeDelivery !== false}
                onChange={(e) => setSettings({ ...settings, excludeDelivery: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-bold text-white block">Exclude Delivery Fees</span>
                <span className="text-[10px] text-slate-400">Delivery charge does not generate coins</span>
              </div>
            </label>

            <label className="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.excludePackaging !== false}
                onChange={(e) => setSettings({ ...settings, excludePackaging: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-bold text-white block">Exclude Packaging Fees</span>
                <span className="text-[10px] text-slate-400">Packaging charge does not generate coins</span>
              </div>
            </label>

            <label className="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.excludeTaxes !== false}
                onChange={(e) => setSettings({ ...settings, excludeTaxes: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-bold text-white block">Exclude GST / Taxes</span>
                <span className="text-[10px] text-slate-400">GST taxes do not generate coins</span>
              </div>
            </label>
          </div>
        </div>

        {/* Live Formula Test Simulator */}
        <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
              <Calculator className="w-4 h-4" />
              <span>Live Rule Verification Simulator</span>
            </h3>
            <span className="text-[11px] text-slate-400">Tests your configured rules in real time</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Test Merchandise Subtotal (₹)
              </label>
              <input
                type="number"
                min="0"
                value={testSubtotal}
                onChange={(e) => setTestSubtotal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Test Discount / Coupon (₹)
              </label>
              <input
                type="number"
                min="0"
                value={testDiscount}
                onChange={(e) => setTestDiscount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Result Card */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400">Eligible Order Subtotal:</span>
                <span className="text-sm font-black text-white">₹{simulatedCalc.eligibleAmount.toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {simulatedCalc.isEligible ? (
                  <span className="text-emerald-400 font-bold">
                    ✅ Eligible (≥ ₹{simulatedCalc.minEligibleOrderAmount})
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold">
                    ❌ Ineligible (Under ₹{simulatedCalc.minEligibleOrderAmount} threshold by ₹{simulatedCalc.shortfall})
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block font-medium">Customer Reward:</span>
              <div className="flex items-baseline space-x-1 sm:justify-end">
                <span className="text-lg font-black text-amber-400">
                  {formatCoins(simulatedCalc.coinsEarned)} Coins
                </span>
                <span className="text-xs text-emerald-400 font-bold">
                  (= ₹{simulatedCalc.coinValueRupees.toFixed(2)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Rules...' : 'Save Loyalty Rules'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
